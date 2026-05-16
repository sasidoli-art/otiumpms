import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const hostId = 'cmnzwtsbg0003rbwfne2ees20'
  const guestEmail = 'a-costanzo@hotmail.it'

  // Usa UTC per evitare shift CET/UTC con @db.Date
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  const existing = await p.prenotazione.findFirst({
    where: { hostId, guestEmail },
    orderBy: { createdAt: 'desc' },
  })

  if (!existing) {
    console.error('Nessuna prenotazione trovata per', guestEmail)
    process.exit(1)
  }

  const updated = await p.prenotazione.update({
    where: { id: existing.id },
    data: {
      dataArrivo: today,
      dataPartenza: tomorrow,
      stato: 'CONFERMATA',
    },
    include: { unita: { select: { nome: true } } },
  })

  console.log('Prenotazione aggiornata:')
  console.log(`  id           ${updated.id}`)
  console.log(`  guest        ${updated.guestNome} ${updated.guestCognome}`)
  console.log(`  email        ${updated.guestEmail}`)
  console.log(`  camera       ${updated.unita?.nome}`)
  console.log(`  dataArrivo   ${updated.dataArrivo.toISOString().slice(0,10)}`)
  console.log(`  dataPartenza ${updated.dataPartenza?.toISOString().slice(0,10)}`)
  console.log(`  stato        ${updated.stato}`)
  console.log('\nDati da inserire sul captive portal (tab "Camera + Cognome"):')
  console.log(`  Nome:           ${updated.guestNome}`)
  console.log(`  Cognome:        ${updated.guestCognome}`)
  console.log(`  Numero camera:  ${updated.unita?.nome}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
