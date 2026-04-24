/**
 * E2E seed — dati deterministici per Playwright.
 *
 * IDEMPOTENT: ri-eseguibile senza conflict. Ogni entità ha un ID noto
 * usato dai test in `/e2e/`.
 *
 * ⚠ ATTENZIONE: non eseguire in produzione. Controlla `DATABASE_URL` prima.
 * Pattern consigliato: database dedicato (Neon branch o Postgres locale)
 * con `.env.test` separato.
 *
 * Uso:
 *   npm run seed:e2e
 *
 * Entità create (tutte upsert):
 *   - User: e2e-host@otium.test · password "Otium2025!"
 *   - Host: e2e-host-001 (partner premium, moduli core attivi)
 *   - Struttura: test-struttura-001 (autoConferma=true)
 *   - Unità: test-unita-001 (80€/notte, 2 posti)
 *   - TrattamentoSpa: test-tratt-001 "Massaggio svedese" (prenotabileOnline)
 *   - TerapistaSpa: test-terap-001
 *   - CabinaSpa: test-cabina-001
 *   - Prenotazione: test-pren-001 (checkInToken: test-checkin-token-001)
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Safety check: refuse to run on a DB that looks like prod
  const url = process.env.DATABASE_URL ?? ''
  if (url.includes('neon.tech') && !url.includes('test') && !url.includes('branch')) {
    console.warn('⚠ DATABASE_URL sembra puntare a Neon production.')
    console.warn('  Interrompi (Ctrl+C) se non è un branch/DB di test.')
    console.warn('  Hai 5 secondi per annullare...')
    await new Promise((r) => setTimeout(r, 5000))
  }

  const password = await bcrypt.hash('Otium2025!', 12)

  // ─── User + Host ─────────────────────────────────────────────────────────
  const hostUser = await prisma.user.upsert({
    where: { email: 'e2e-host@otium.test' },
    update: {},
    create: {
      email: 'e2e-host@otium.test',
      password,
      nome: 'E2E',
      cognome: 'Host',
      role: 'HOST',
    },
  })

  const host = await prisma.host.upsert({
    where: { id: 'e2e-host-001' },
    update: {
      userId: hostUser.id,
      piano: 'PARTNER_PREMIUM',
      statoAbbonamento: 'ATTIVO',
      moduliAttivi: JSON.stringify({
        prenotazioni: true, strutture: true, crm: true, housekeeping: true,
        spa: true, pos: true, cassa: true, fatture: true, emailAuto: true,
      }),
      dpaAccettato: true,
      onboardingStep: 99, // onboarding completato
    },
    create: {
      id: 'e2e-host-001',
      userId: hostUser.id,
      nomeAzienda: 'E2E Test Hotel',
      partitaIva: '99999999999',
      codiceFiscale: 'E2ETEST00A01H501Z',
      telefono: '+39 000 0000000',
      indirizzo: 'Via Test 1',
      citta: 'Roma',
      provincia: 'RM',
      cap: '00100',
      regione: 'Lazio',
      piano: 'PARTNER_PREMIUM',
      statoAbbonamento: 'ATTIVO',
      dataInizioAbb: new Date('2026-01-01'),
      moduliAttivi: JSON.stringify({
        prenotazioni: true, strutture: true, crm: true, housekeeping: true,
        spa: true, pos: true, cassa: true, fatture: true, emailAuto: true,
      }),
      dpaAccettato: true,
      onboardingStep: 99,
    },
  })
  console.log('✅ Host E2E:', host.nomeAzienda, host.id)

  // ─── Struttura (autoConferma=true per flow booking diretto) ───────────────
  const struttura = await prisma.struttura.upsert({
    where: { id: 'test-struttura-001' },
    update: {
      hostId: host.id,
      attiva: true,
      autoConferma: true,
    },
    create: {
      id: 'test-struttura-001',
      hostId: host.id,
      nome: 'Hotel E2E Test',
      tipo: 'ALLOGGIO',
      descrizione: 'Struttura usata solo da Playwright E2E',
      citta: 'Roma',
      regione: 'Lazio',
      indirizzo: 'Via Test 1, 00100 Roma',
      capacitaTotale: 10,
      prezzoBase: 80,
      attiva: true,
      autoConferma: true,
      colorePrimario: '#4f46e5',
    },
  })
  console.log('✅ Struttura:', struttura.nome)

  // ─── Unità (camera standard) ──────────────────────────────────────────────
  const unita = await prisma.unitaPrenotabile.upsert({
    where: { id: 'test-unita-001' },
    update: {
      attiva: true,
      statoHK: 'PULITA',
    },
    create: {
      id: 'test-unita-001',
      strutturaId: struttura.id,
      nome: 'Camera Test Standard',
      descrizione: 'Camera doppia per test automatici',
      capacita: 2,
      lettiExtra: 1,
      prezzoBase: 80,
      prezzoLettoExtra: 20,
      attiva: true,
      statoHK: 'PULITA',
    },
  })
  console.log('✅ Unità:', unita.nome)

  // ─── SPA: Terapista + Cabina + Trattamento ────────────────────────────────
  const terapista = await prisma.terapistaSpa.upsert({
    where: { id: 'test-terap-001' },
    update: { attivo: true },
    create: {
      id: 'test-terap-001',
      hostId: host.id,
      nome: 'Anna',
      cognome: 'E2E',
      email: 'anna@e2e.test',
      colore: '#6366f1',
      specializzazioni: ['massaggio'],
      attivo: true,
      profiloPublico: true,
    },
  })
  console.log('✅ Terapista:', terapista.nome)

  const cabina = await prisma.cabinaSpa.upsert({
    where: { id: 'test-cabina-001' },
    update: { attiva: true },
    create: {
      id: 'test-cabina-001',
      hostId: host.id,
      nome: 'Cabina Test',
      descrizione: 'Cabina per test E2E',
      capacita: 1,
      attiva: true,
      statoHK: 'PULITA',
    },
  })
  console.log('✅ Cabina:', cabina.nome)

  const trattamento = await prisma.trattamentoSpa.upsert({
    where: { id: 'test-tratt-001' },
    update: {
      attivo: true,
      prenotabileOnline: true,
    },
    create: {
      id: 'test-tratt-001',
      hostId: host.id,
      nome: 'Massaggio svedese',
      categoria: 'MASSAGGIO',
      durata: 60,
      prezzo: 80,
      descrizione: 'Massaggio classico svedese rilassante — 60 minuti',
      attivo: true,
      prenotabileOnline: true,
    },
  })
  console.log('✅ Trattamento:', trattamento.nome)

  // ─── Prenotazione pre-esistente per test check-in ─────────────────────────
  // checkInToken noto così il test può andare a /checkin/<token>
  const domani = new Date()
  domani.setDate(domani.getDate() + 1)
  domani.setHours(0, 0, 0, 0)
  const dopodomani = new Date(domani)
  dopodomani.setDate(dopodomani.getDate() + 3)

  const prenotazione = await prisma.prenotazione.upsert({
    where: { id: 'test-pren-001' },
    update: {
      stato: 'CONFERMATA',
      statoCheckIn: 'NON_INIZIATO',
      checkInCompletato: false,
      regCardFirmata: false,
      checkInToken: 'test-checkin-token-001',
      dataArrivo: domani,
      dataPartenza: dopodomani,
    },
    create: {
      id: 'test-pren-001',
      hostId: host.id,
      strutturaId: struttura.id,
      unitaId: unita.id,
      guestNome: 'Giulia',
      guestCognome: 'TestCheckIn',
      guestEmail: 'giulia.checkin@e2e.test',
      guestTelefono: '+393400000001',
      guestLingua: 'it',
      dataArrivo: domani,
      dataPartenza: dopodomani,
      numOspiti: 1,
      stato: 'CONFERMATA',
      fonte: 'Web',
      prezzoTotale: 240,
      tassaSoggiorno: null,
      checkInToken: 'test-checkin-token-001',
      statoCheckIn: 'NON_INIZIATO',
      checkInCompletato: false,
      regCardFirmata: false,
    },
  })
  console.log('✅ Prenotazione check-in:', prenotazione.id, '(token:', prenotazione.checkInToken + ')')

  // ─── TariffaPeriodo vuota (niente alta stagione) ──────────────────────────
  // Lasciamo prezzo pulito = prezzoBase unità per prevedibilità booking test

  console.log('\n✓ Seed E2E completato.')
  console.log('  Login: e2e-host@otium.test / Otium2025!')
  console.log('  Struttura ID: test-struttura-001')
  console.log('  Check-in URL: /checkin/test-checkin-token-001')
}

main()
  .catch((e) => {
    console.error('❌ Seed E2E fallito:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
