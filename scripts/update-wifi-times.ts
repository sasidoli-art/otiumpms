import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const r = await p.host.updateMany({
    where: {
      OR: [
        { wifiCheckInTime: '14:00' },
        { wifiCheckOutTime: '11:00' },
      ],
    },
    data: {
      wifiCheckInTime: '06:00',
      wifiCheckOutTime: '22:00',
    },
  })
  console.log(`Updated ${r.count} host(s)`)
  const all = await p.host.findMany({
    select: { nomeAzienda: true, wifiCheckInTime: true, wifiCheckOutTime: true },
  })
  console.log(all)
}
main().catch(console.error).finally(() => p.$disconnect())
