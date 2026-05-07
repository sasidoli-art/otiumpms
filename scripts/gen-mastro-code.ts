import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const hostId = 'cmnzwtsbg0003rbwfne2ees20' // Masseria MastroBerardino
  const codice = 'MASTRO2026'
  const validoFino = new Date()
  validoFino.setDate(validoFino.getDate() + 30)

  const existing = await p.wifiAccessCode.findUnique({ where: { codice } })
  if (existing) {
    await p.wifiAccessCode.update({
      where: { id: existing.id },
      data: { hostId, durataMinuti: 1440, usiMax: -1, usiEffettuati: 0, validoFino, revocatoAt: null, note: 'Test Mastroberardino' },
    })
    console.log(`Updated existing code: ${codice}`)
  } else {
    await p.wifiAccessCode.create({
      data: { hostId, codice, durataMinuti: 1440, usiMax: -1, validoFino, note: 'Test Mastroberardino' },
    })
    console.log(`Created new code: ${codice}`)
  }
  console.log(`Host: ${hostId}`)
  console.log(`Valid until: ${validoFino.toISOString()}`)
  console.log(`Durata: 1440 min (24h)`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
