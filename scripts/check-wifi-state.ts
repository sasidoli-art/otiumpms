import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const all = await p.wifiDevice.findMany({ select: { id: true, mac: true, alias: true, hostId: true } })
  console.log('Tutti i WifiDevice:')
  all.forEach(d => console.log(' ', d))
  console.log()

  const host = await p.host.findUnique({
    where: { id: 'cmnzwtsbg0003rbwfne2ees20' },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })
  console.log('Host Mastroberardino:')
  console.log(JSON.stringify(host, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
