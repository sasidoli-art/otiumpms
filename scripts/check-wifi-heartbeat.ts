import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const device = await prisma.wifiDevice.findFirst({
    where: { mac: '40A5EFE23F7F' },
    select: {
      mac: true,
      alias: true,
      stato: true,
      ultimoHeartbeatAt: true,
      ultimoIpPubblico: true,
    },
  })

  if (!device) {
    console.log('Device not found for MAC 40A5EFE23F7F')
    process.exit(1)
  }

  const ageSec = device.ultimoHeartbeatAt
    ? Math.round((Date.now() - device.ultimoHeartbeatAt.getTime()) / 1000)
    : null

  console.log('Device alias:', device.alias)
  console.log('Stato:', device.stato)
  console.log('UltimoHeartbeatAt:', device.ultimoHeartbeatAt?.toISOString() ?? 'NEVER')
  console.log('Age (seconds):', ageSec)
  console.log('UltimoIpPubblico:', device.ultimoIpPubblico)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
