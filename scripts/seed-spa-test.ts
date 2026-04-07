/**
 * Crea ~6 appuntamenti SPA di test per OGGI sull'host di test.
 * Uso: npx tsx scripts/seed-spa-test.ts [hostEmail]
 */
import { prisma } from '../lib/db'

async function main() {
  const hostEmail = process.argv[2] ?? 'host@otiumweek.it'

  const user = await prisma.user.findUnique({ where: { email: hostEmail } })
  if (!user) throw new Error(`User non trovato: ${hostEmail}`)

  const host = await prisma.host.findUnique({ where: { userId: user.id } })
  if (!host) throw new Error(`Host non trovato per user ${hostEmail}`)

  console.log(`Host: ${host.nomeAzienda} (${host.id})`)

  // Carica risorse esistenti (se ci sono) — usiamo il primo trattamento/terapista/cabina disponibili
  const trattamenti = await prisma.trattamentoSpa.findMany({
    where: { hostId: host.id, attivo: true },
    take: 5,
  })
  const terapisti = await prisma.terapistaSpa.findMany({
    where: { hostId: host.id, attivo: true },
    take: 5,
  })
  const cabine = await prisma.cabinaSpa.findMany({
    where: { hostId: host.id, attiva: true },
    take: 5,
  })

  if (trattamenti.length === 0) {
    console.warn('⚠️  Nessun trattamento attivo — creane almeno uno da /host/spa/trattamenti')
  }
  if (terapisti.length === 0) {
    console.warn('⚠️  Nessun terapista attivo — creane almeno uno da /host/spa/terapisti')
  }
  if (cabine.length === 0) {
    console.warn('⚠️  Nessuna cabina attiva — creane almeno una da /host/spa/cabine')
  }

  const ospitiTest = [
    { nome: 'Giulia', cognome: 'Bianchi', email: 'giulia.bianchi@test.it', tel: '+39 333 1112233' },
    { nome: 'Marco', cognome: 'Rossi', email: 'marco.rossi@test.it', tel: '+39 333 2223344' },
    { nome: 'Sofia', cognome: 'Esposito', email: 'sofia.esposito@test.it', tel: '+39 333 3334455' },
    { nome: 'Luca', cognome: 'Ferrari', email: 'luca.ferrari@test.it', tel: '+39 333 4445566' },
    { nome: 'Anna', cognome: 'Romano', email: 'anna.romano@test.it', tel: '+39 333 5556677' },
    { nome: 'Davide', cognome: 'Conti', email: 'davide.conti@test.it', tel: '+39 333 6667788' },
  ]

  // Slot orari oggi: 10:00, 11:00, 14:00, 15:30, 16:30, 18:00
  const oggi = new Date()
  const slots = [
    [10, 0],
    [11, 0],
    [14, 0],
    [15, 30],
    [16, 30],
    [18, 0],
  ]

  // Pulisci i test precedenti di oggi
  const inizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 0, 0, 0)
  const fineOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 23, 59, 59)
  const deleted = await prisma.appuntamentoSpa.deleteMany({
    where: {
      hostId: host.id,
      dataOra: { gte: inizioOggi, lte: fineOggi },
      guestEmail: { in: ospitiTest.map(o => o.email) },
    },
  })
  if (deleted.count > 0) console.log(`Eliminati ${deleted.count} appuntamenti test precedenti`)

  let creati = 0
  for (let i = 0; i < ospitiTest.length; i++) {
    const o = ospitiTest[i]
    const [h, m] = slots[i]
    const dataOra = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), h, m, 0)
    const tratt = trattamenti[i % Math.max(1, trattamenti.length)]
    const terap = terapisti[i % Math.max(1, terapisti.length)]
    const cab = cabine[i % Math.max(1, cabine.length)]

    await prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: o.nome,
        guestCognome: o.cognome,
        guestEmail: o.email,
        guestTelefono: o.tel,
        dataOra,
        durata: tratt?.durata ?? 60,
        prezzoTotale: tratt?.prezzo ?? 80,
        stato: 'CONFERMATO',
        trattamentoId: tratt?.id ?? null,
        terapistaId: terap?.id ?? null,
        cabinaId: cab?.id ?? null,
        waiverObbligatorio: true,
        note: 'Appuntamento di test',
      },
    })
    creati++
    console.log(`✓ ${o.nome} ${o.cognome} — ${h}:${m.toString().padStart(2, '0')} — ${tratt?.nome ?? '(no trattamento)'}`)
  }

  console.log(`\n✅ Creati ${creati} appuntamenti SPA per oggi (${oggi.toLocaleDateString('it-IT')})`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
