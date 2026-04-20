/**
 * One-shot migration: encrypt existing plaintext secrets in DB.
 *
 * Requires APP_ENCRYPTION_KEY in env. Idempotent (skips already-encrypted values).
 *
 * Run: npx tsx scripts/encrypt-existing-secrets.ts
 */

import { prisma } from '../lib/db'
import { encrypt, isEncrypted } from '../lib/crypto'
import { HOST_SECRET_FIELDS, PAYMENT_SECRET_FIELDS } from '../lib/secrets'

async function main() {
  if (!process.env.APP_ENCRYPTION_KEY) {
    console.error('APP_ENCRYPTION_KEY missing. Generate with:')
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"')
    process.exit(1)
  }

  let hostsUpdated = 0
  let paymentUpdated = 0

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
    const patch: Record<string, string> = {}
    for (const f of HOST_SECRET_FIELDS) {
      const v = (host as any)[f] as string | null
      if (v && !isEncrypted(v)) patch[f] = encrypt(v)
    }
    if (Object.keys(patch).length > 0) {
      await prisma.host.update({ where: { id: host.id }, data: patch })
      hostsUpdated++
      console.log(`  Host ${host.id}: encrypted ${Object.keys(patch).join(', ')}`)
    }
  }

  const configs = await prisma.paymentProviderConfig.findMany({
    select: { hostId: true, stripeSecretKey: true, adyenApiKey: true, nexiApiKey: true, sumupApiKey: true },
  })

  for (const cfg of configs) {
    const patch: Record<string, string> = {}
    for (const f of PAYMENT_SECRET_FIELDS) {
      const v = (cfg as any)[f] as string | null
      if (v && !isEncrypted(v)) patch[f] = encrypt(v)
    }
    if (Object.keys(patch).length > 0) {
      await prisma.paymentProviderConfig.update({ where: { hostId: cfg.hostId }, data: patch })
      paymentUpdated++
      console.log(`  PaymentConfig ${cfg.hostId}: encrypted ${Object.keys(patch).join(', ')}`)
    }
  }

  console.log(`\nDone. Hosts updated: ${hostsUpdated}. PaymentConfigs updated: ${paymentUpdated}.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
