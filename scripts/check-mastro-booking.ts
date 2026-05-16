import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const hostId = 'cmnzwtsbg0003rbwfne2ees20'

  const unita = await p.unitaPrenotabile.findMany({
    where: { struttura: { hostId } },
    select: { id: true, nome: true, strutturaId: true },
    take: 30,
  })
  console.log('=== Unità Mastroberardino ===')
  unita.forEach(u => console.log(`  ${u.nome}  (id=${u.id})`))

  const found = await p.prenotazione.findMany({
    where: {
      hostId,
      OR: [
        { guestEmail: 'a-costanzo@hotmail.it' },
        { AND: [{ guestNome: { contains: 'Antonio', mode: 'insensitive' } }, { guestCognome: { contains: 'Costanzo', mode: 'insensitive' } }] },
      ],
    },
    select: { id: true, guestNome: true, guestCognome: true, guestEmail: true, dataArrivo: true, dataPartenza: true, stato: true, unita: { select: { nome: true } } },
  })
  console.log('\n=== Prenotazioni Antonio Costanzo ===')
  if (found.length === 0) console.log('  (nessuna)')
  found.forEach(b => console.log(`  ${b.guestNome} ${b.guestCognome} <${b.guestEmail}> camera=${b.unita?.nome ?? '-'} arrivo=${b.dataArrivo.toISOString().slice(0,10)} partenza=${b.dataPartenza?.toISOString().slice(0,10) ?? '-'} stato=${b.stato} id=${b.id}`))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
