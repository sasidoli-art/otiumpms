import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'

/**
 * Registra un nuovo WifiDevice (router Comfast) nel PMS Otium.
 *
 * Usage:
 *   npx tsx scripts/gen-wifi-device.ts <hostId> <MAC> <alias> [modello] [splashUrl]
 *
 * Example:
 *   npx tsx scripts/gen-wifi-device.ts cmxxx... AABBCCDDEEFF "Reception CF-AC101" CF-AC101 https://www.ilpoggio.it
 *
 * Il MAC deve essere normalizzato (12 hex uppercase, senza separatori).
 * Lo script genera un apiToken casuale, ne salva l'hash, e stampa il token
 * in chiaro UNA VOLTA — va copiato nel router come bearer per l'agent API.
 */
const prisma = new PrismaClient()

async function main() {
  const [, , hostIdArg, macArg, aliasArg, modelloArg, splashUrlArg] = process.argv

  if (!hostIdArg || !macArg || !aliasArg) {
    console.error('Usage: npx tsx scripts/gen-wifi-device.ts <hostId> <MAC> <alias> [modello] [splashUrl]')
    process.exit(1)
  }

  const macNorm = macArg.toUpperCase().replace(/[^0-9A-F]/g, '')
  if (macNorm.length !== 12) {
    console.error(`Error: MAC must be 12 hex chars, got "${macArg}" (normalized: "${macNorm}")`)
    process.exit(1)
  }

  const host = await prisma.host.findUnique({
    where: { id: hostIdArg },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })
  if (!host) {
    console.error(`Error: Host "${hostIdArg}" not found`)
    process.exit(1)
  }

  // Genera token in chiaro + hash sha256
  const apiToken = crypto.randomBytes(24).toString('base64url')
  const apiTokenHash = crypto.createHash('sha256').update(apiToken).digest('hex')

  const splashConfig =
    splashUrlArg && /^https?:\/\//.test(splashUrlArg)
      ? { linkRedirect: splashUrlArg }
      : undefined

  const existing = await prisma.wifiDevice.findUnique({ where: { mac: macNorm } })

  if (existing) {
    if (existing.hostId !== host.id) {
      console.error(
        `Error: MAC ${macNorm} already registered under a different host (${existing.hostId}). Use PMS UI to move.`
      )
      process.exit(1)
    }
    await prisma.wifiDevice.update({
      where: { id: existing.id },
      data: {
        alias: aliasArg,
        modello: modelloArg ?? existing.modello,
        apiTokenHash,
        ...(splashConfig ? { splashConfig } : {}),
      },
    })
    console.log(`✓ Updated existing WifiDevice ${macNorm} for host "${host.nomeAzienda}"`)
  } else {
    await prisma.wifiDevice.create({
      data: {
        hostId: host.id,
        alias: aliasArg,
        mac: macNorm,
        modello: modelloArg ?? null,
        apiTokenHash,
        stato: 'PENDING',
        ...(splashConfig ? { splashConfig } : {}),
      },
    })
    console.log(`✓ Created new WifiDevice ${macNorm} for host "${host.nomeAzienda}"`)
  }

  console.log('')
  console.log('API token (save now, shown only once):')
  console.log(`  ${apiToken}`)
  console.log('')
  console.log(`gw_id per wifidog config: ${macNorm}`)
  if (splashUrlArg) console.log(`Landing URL post-login: ${splashUrlArg}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
