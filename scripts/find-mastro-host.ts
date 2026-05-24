import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const hosts = await prisma.host.findMany({
    where: {
      OR: [
        { nomeAzienda: { contains: 'mastro', mode: 'insensitive' } },
        { nomeAzienda: { contains: 'Mastro', mode: 'insensitive' } },
      ],
    },
    select: { id: true, nomeAzienda: true, moduliAttivi: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  console.log(`Found ${hosts.length} matching host(s):\n`)
  for (const h of hosts) {
    console.log(`  ID: ${h.id}`)
    console.log(`  Nome: ${h.nomeAzienda}`)
    console.log(`  Moduli: ${JSON.stringify(h.moduliAttivi)}`)
    console.log(`  Creato: ${h.createdAt.toISOString()}`)
    console.log('')
  }

  // Anche check WifiDevice esistenti
  const devices = await prisma.wifiDevice.findMany({
    select: { id: true, mac: true, alias: true, hostId: true, stato: true },
  })
  console.log(`\n=== Total WifiDevice nel DB: ${devices.length} ===`)
  for (const d of devices) {
    console.log(`  ${d.mac} | ${d.alias} | stato=${d.stato} | hostId=${d.hostId}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
