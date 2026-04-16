import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const NOMI_CAMERE = [
  { nome: "'A Stanza d'o Mare", desc: "Vista sul golfo, brezza marina, colori azzurri", cap: 2, extra: 1, prezzo: 95 },
  { nome: "'A Stanza d'o Sole", desc: "Esposta a sud, luce naturale tutto il giorno", cap: 2, extra: 0, prezzo: 85 },
  { nome: "'A Suite d'o Vesuvio", desc: "Suite panoramica con vista Vesuvio, terrazzino privato", cap: 3, extra: 1, prezzo: 145 },
  { nome: "'A Cammera d'a Principessa", desc: "Romantica con baldacchino e dettagli in ferro battuto", cap: 2, extra: 0, prezzo: 110 },
  { nome: "'O Rifugio d'e Limonelle", desc: "Tra i limoni, profumo di agrumi, accesso giardino", cap: 2, extra: 1, prezzo: 90 },
  { nome: "'O Giardino Segreto", desc: "Piano terra con patio privato e fontanella", cap: 4, extra: 2, prezzo: 130 },
  { nome: "'A Stanza d'a Terrazza", desc: "Terrazza condivisa con vista colline, tramonto spettacolare", cap: 2, extra: 0, prezzo: 80 },
  { nome: "'A Suite d'a Duchessa", desc: "La piu grande, vasca idromassaggio, salotto separato", cap: 2, extra: 1, prezzo: 165 },
  { nome: "'O Chiostro", desc: "Nella vecchia ala del monastero, soffitti a volta", cap: 3, extra: 0, prezzo: 105 },
  { nome: "'A Loggia d'o Pescatore", desc: "Rustica con reti decorative, letto in legno di barca", cap: 2, extra: 0, prezzo: 75 },
]

const NOMI_OSPITI = [
  { nome: 'Giovanni', cognome: 'Esposito', email: 'giovanni.esposito@example.com', tel: '+393281234501' },
  { nome: 'Maria', cognome: 'Russo', email: 'maria.russo@example.com', tel: '+393281234502' },
  { nome: 'Antonio', cognome: 'Ferrara', email: 'antonio.ferrara@example.com', tel: '+393281234503' },
  { nome: 'Carmela', cognome: 'De Luca', email: 'carmela.deluca@example.com', tel: '+393281234504' },
  { nome: 'Salvatore', cognome: 'Romano', email: 'salvatore.romano@example.com', tel: '+393281234505' },
  { nome: 'Rosa', cognome: 'Gallo', email: 'rosa.gallo@example.com', tel: '+393281234506' },
  { nome: 'Vincenzo', cognome: 'Sorrentino', email: 'vincenzo.sorrentino@example.com', tel: '+393281234507' },
  { nome: 'Anna', cognome: 'Caputo', email: 'anna.caputo@example.com', tel: '+393281234508' },
  { nome: 'Francesco', cognome: 'Amato', email: 'francesco.amato@example.com', tel: '+393281234509' },
  { nome: 'Teresa', cognome: 'Vitale', email: 'teresa.vitale@example.com', tel: '+393281234510' },
  { nome: 'Klaus', cognome: 'Müller', email: 'klaus.mueller@example.de', tel: '+4915112345601' },
  { nome: 'Sophie', cognome: 'Durand', email: 'sophie.durand@example.fr', tel: '+33612345602' },
  { nome: 'James', cognome: 'Smith', email: 'james.smith@example.co.uk', tel: '+44771234503' },
  { nome: 'Chiara', cognome: 'Bianchi', email: 'chiara.bianchi@example.com', tel: '+393331234511' },
  { nome: 'Pasquale', cognome: 'Coppola', email: 'pasquale.coppola@example.com', tel: '+393351234512' },
]

function randomDate(from: Date, to: Date) {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()))
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

async function main() {
  // Trova Agriturismo Vastulill
  const struttura = await p.struttura.findFirst({
    where: { nome: { contains: 'Vastulill' } },
    include: { unita: true, host: true },
  })
  if (!struttura) { console.log('Struttura Vastulill non trovata!'); return }

  console.log(`Trovata: ${struttura.nome} (${struttura.id}) — ${struttura.unita.length} unità`)

  // 1. Rinomina le unità esistenti
  const unita = struttura.unita.sort((a, b) => a.nome.localeCompare(b.nome))
  for (let i = 0; i < Math.min(unita.length, NOMI_CAMERE.length); i++) {
    const cam = NOMI_CAMERE[i]
    await p.unitaPrenotabile.update({
      where: { id: unita[i].id },
      data: {
        nome: cam.nome,
        descrizione: cam.desc,
        capacita: cam.cap,
        lettiExtra: cam.extra,
        prezzoBase: cam.prezzo,
        piano: i < 5 ? 0 : 1,
      },
    })
    console.log(`  ✅ ${unita[i].nome} → ${cam.nome} (€${cam.prezzo}, ${cam.cap}+${cam.extra} posti)`)
  }

  // 2. Aggiungi tariffe stagionali
  const now = new Date()
  const year = now.getFullYear()
  const tariffe = [
    { nome: 'Bassa Stagione', inizio: new Date(year, 0, 7), fine: new Date(year, 3, 30), moltiplicatore: 0.8 },
    { nome: 'Media Stagione', inizio: new Date(year, 4, 1), fine: new Date(year, 5, 14), moltiplicatore: 1.0 },
    { nome: 'Alta Stagione', inizio: new Date(year, 5, 15), fine: new Date(year, 8, 15), moltiplicatore: 1.3 },
    { nome: 'Ponte/Festivi', inizio: new Date(year, 11, 20), fine: new Date(year + 1, 0, 6), moltiplicatore: 1.5 },
  ]

  for (const u of unita) {
    for (const t of tariffe) {
      const base = NOMI_CAMERE.find(c => c.nome === u.nome)?.prezzo || u.prezzoBase
      await p.tariffaPeriodo.create({
        data: {
          unitaId: u.id,
          nome: t.nome,
          dataInizio: t.inizio,
          dataFine: t.fine,
          prezzo: Math.round(base * t.moltiplicatore),
        },
      })
    }
  }
  console.log(`\n  ✅ ${tariffe.length * unita.length} tariffe stagionali create`)

  // 3. Crea prenotazioni random
  const hostId = struttura.hostId
  const unitaIds = unita.map(u => u.id)
  let created = 0

  for (const ospite of NOMI_OSPITI) {
    const numBookings = 1 + Math.floor(Math.random() * 2) // 1-2 prenotazioni per ospite
    for (let b = 0; b < numBookings; b++) {
      const unitaIdx = Math.floor(Math.random() * unitaIds.length)
      const cam = NOMI_CAMERE[unitaIdx] || NOMI_CAMERE[0]
      const arrivo = randomDate(new Date(year, 3, 1), new Date(year, 7, 31))
      const notti = 2 + Math.floor(Math.random() * 5) // 2-6 notti
      const partenza = addDays(arrivo, notti)
      const numOspiti = 1 + Math.floor(Math.random() * cam.cap)
      const isPast = arrivo < now
      const isCurrent = arrivo <= now && partenza >= now

      const stati = isPast
        ? ['COMPLETATA', 'COMPLETATA', 'COMPLETATA', 'ANNULLATA'] as const
        : ['CONFERMATA', 'CONFERMATA', 'RICHIESTA', 'CONFERMATA'] as const

      const stato = stati[Math.floor(Math.random() * stati.length)]

      try {
        await p.prenotazione.create({
          data: {
            hostId,
            strutturaId: struttura.id,
            unitaId: unitaIds[unitaIdx],
            guestNome: ospite.nome,
            guestCognome: ospite.cognome,
            guestEmail: ospite.email,
            guestTelefono: ospite.tel,
            dataArrivo: arrivo,
            dataPartenza: partenza,
            numOspiti,
            prezzoTotale: cam.prezzo * notti,
            stato,
            noteInterne: isCurrent ? 'Ospite attualmente in struttura' : null,
            fonte: ['Diretto', 'Web', 'Tel', 'Booking.com', 'Email'][Math.floor(Math.random() * 5)],
          },
        })
        created++
      } catch { /* skip duplicates */ }
    }
  }

  console.log(`\n  ✅ ${created} prenotazioni create`)
  console.log('\nDone! Agriturismo Vastulill pronto per la demo.')
}

main().finally(() => p.$disconnect())
