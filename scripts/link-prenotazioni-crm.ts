import { prisma } from '@/lib/db'

/**
 * Collega le prenotazioni esistenti agli ospiti CRM tramite guestEmail.
 * Script idempotente: salta prenotazioni con ospiteCrmId già valorizzato.
 */
async function main() {
  console.log('🔗 Inizio collegamento Prenotazione → OspiteCRM')

  const prenotazioni = await prisma.prenotazione.findMany({
    where: { ospiteCrmId: null },
    select: { id: true, hostId: true, guestEmail: true, guestNome: true, guestCognome: true },
  })

  console.log(`   Prenotazioni senza ospiteCrmId: ${prenotazioni.length}`)

  let collegate = 0
  let nonTrovate = 0

  for (const p of prenotazioni) {
    if (!p.guestEmail) continue

    const ospite = await prisma.ospiteCRM.findUnique({
      where: { hostId_email: { hostId: p.hostId, email: p.guestEmail } },
      select: { id: true },
    })

    if (!ospite) {
      nonTrovate++
      continue
    }

    await prisma.prenotazione.update({
      where: { id: p.id },
      data: { ospiteCrmId: ospite.id },
    })

    collegate++
  }

  console.log(`\n✅ Completato:`)
  console.log(`   ${collegate} prenotazioni collegate a OspiteCRM`)
  console.log(`   ${nonTrovate} ospiti non trovati nel CRM (nessun record CRM per quella email)`)
}

main()
  .catch((err) => {
    console.error('❌ Errore:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
