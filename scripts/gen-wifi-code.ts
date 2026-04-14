import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const hostId = 'cmnggq9o90005t1r2b0wri2so'
  const codice = 'OTIUMLAB'

  const validoFino = new Date()
  validoFino.setDate(validoFino.getDate() + 30)

  const existing = await prisma.wifiAccessCode.findUnique({ where: { codice } })
  if (existing) {
    await prisma.wifiAccessCode.update({
      where: { id: existing.id },
      data: {
        hostId,
        durataMinuti: 1440,
        usiMax: -1,
        usiEffettuati: 0,
        validoFino,
        revocatoAt: null,
        note: 'Test Otium_Lab',
      },
    })
    console.log(`Updated existing code: ${codice}`)
  } else {
    await prisma.wifiAccessCode.create({
      data: {
        hostId,
        codice,
        durataMinuti: 1440,
        usiMax: -1,
        validoFino,
        note: 'Test Otium_Lab',
      },
    })
    console.log(`Created new code: ${codice}`)
  }

  console.log(`Valid until: ${validoFino.toISOString()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
