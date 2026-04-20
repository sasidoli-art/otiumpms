/**
 * Migrate secrets in DB to the current encryption format.
 *
 * Handles three cases per field:
 *  - plaintext (legacy before encryption): encrypt to new format
 *  - "enc:v1:..." (legacy from commit c2cc6f3): decrypt with APP_ENCRYPTION_KEY
 *    then re-encrypt with ENCRYPTION_KEY (new format)
 *  - "plain:..." (dev mode): leave as-is
 *  - new format "iv:enc:tag": leave as-is
 *
 * Requires ENCRYPTION_KEY in env. If APP_ENCRYPTION_KEY also set, legacy
 * values will be migrated to the new format.
 *
 * Run: npx tsx scripts/encrypt-existing-secrets.ts
 */

import { prisma } from '../lib/db'
import { encrypt, decrypt, isEncrypted } from '../lib/crypto'
import { HOST_SECRET_FIELDS, PAYMENT_SECRET_FIELDS } from '../lib/secrets'

function reencodeIfNeeded(value: string | null): { action: 'skip' | 'encrypt' | 'migrate'; newValue: string | null } {
  if (!value) return { action: 'skip', newValue: null }
  // Already new format (iv:enc:tag) or plain: dev mode → skip
  if (isEncrypted(value) && !value.startsWith('enc:v1:')) {
    return { action: 'skip', newValue: value }
  }
  // Legacy enc:v1 from commit c2cc6f3 → decrypt and re-encrypt with new format
  if (value.startsWith('enc:v1:')) {
    try {
      const plaintext = decrypt(value)
      return { action: 'migrate', newValue: encrypt(plaintext) }
    } catch (e) {
      console.error(`  Failed to decrypt legacy enc:v1 value: ${(e as Error).message}`)
      return { action: 'skip', newValue: value }
    }
  }
  // Plaintext → encrypt
  return { action: 'encrypt', newValue: encrypt(value) }
}

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY missing. Generate with:')
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
    process.exit(1)
  }

  let hostsEncrypted = 0
  let hostsMigrated = 0
  let paymentEncrypted = 0
  let paymentMigrated = 0

  const hosts = await prisma.host.findMany({
    select: {
      id: true,
      smtpPass: true,
      conciergeApiKey: true,
      whatsappAccessToken: true,
      sdiApiKey: true,
    },
  })

  for (const host of hosts) {
    const patch: Record<string, string | null> = {}
    const actions: Record<string, string> = {}
    for (const f of HOST_SECRET_FIELDS) {
      const v = (host as Record<string, string | null>)[f]
      const { action, newValue } = reencodeIfNeeded(v)
      if (action !== 'skip' && newValue !== v) {
        patch[f] = newValue
        actions[f] = action
      }
    }
    if (Object.keys(patch).length > 0) {
      await prisma.host.update({ where: { id: host.id }, data: patch })
      const summary = Object.entries(actions).map(([k, a]) => `${k}(${a})`).join(', ')
      console.log(`  Host ${host.id}: ${summary}`)
      if (Object.values(actions).some((a) => a === 'migrate')) hostsMigrated++
      if (Object.values(actions).some((a) => a === 'encrypt')) hostsEncrypted++
    }
  }

  const configs = await prisma.paymentProviderConfig.findMany({
    select: { hostId: true, stripeSecretKey: true, adyenApiKey: true, nexiApiKey: true, sumupApiKey: true },
  })

  for (const cfg of configs) {
    const patch: Record<string, string | null> = {}
    const actions: Record<string, string> = {}
    for (const f of PAYMENT_SECRET_FIELDS) {
      const v = (cfg as Record<string, string | null>)[f]
      const { action, newValue } = reencodeIfNeeded(v)
      if (action !== 'skip' && newValue !== v) {
        patch[f] = newValue
        actions[f] = action
      }
    }
    if (Object.keys(patch).length > 0) {
      await prisma.paymentProviderConfig.update({ where: { hostId: cfg.hostId }, data: patch })
      const summary = Object.entries(actions).map(([k, a]) => `${k}(${a})`).join(', ')
      console.log(`  PaymentConfig ${cfg.hostId}: ${summary}`)
      if (Object.values(actions).some((a) => a === 'migrate')) paymentMigrated++
      if (Object.values(actions).some((a) => a === 'encrypt')) paymentEncrypted++
    }
  }

  console.log(`\nDone.`)
  console.log(`  Hosts: encrypted=${hostsEncrypted}, migrated=${hostsMigrated}`)
  console.log(`  PaymentConfigs: encrypted=${paymentEncrypted}, migrated=${paymentMigrated}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
