/**
 * Factory dati test — costruisce oggetti Prisma-like con campi minimi
 * obbligatori compilati + override. Non usa tipi Prisma completi (troppo
 * verbose per i test) ma la "shape" è coerente con lo schema.
 */

const now = new Date('2026-04-24T10:00:00Z')

// ─── Host ────────────────────────────────────────────────────────────────────

export type TestHost = {
  id: string
  nomeAzienda: string
  email: string
  moduliAttivi: string // JSON string
  onboardingStep: number
  dpaAccettato: boolean
  createdAt: Date
  updatedAt: Date
  [k: string]: unknown
}

export function createTestHost(overrides: Partial<TestHost> = {}): TestHost {
  return {
    id: 'host-test-001',
    nomeAzienda: 'Hotel Test',
    email: 'test@hotel.it',
    moduliAttivi: JSON.stringify({
      prenotazioni: true, strutture: true, crm: true, housekeeping: true,
      spa: true, pos: true,
    }),
    onboardingStep: 5,
    dpaAccettato: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// ─── Struttura ───────────────────────────────────────────────────────────────

export type TestStruttura = {
  id: string
  hostId: string
  nome: string
  tipo: 'ALLOGGIO' | 'VENUE' | 'ESPERIENZA' | 'EVENTO' | 'SERVIZIO'
  citta: string | null
  regione: string | null
  capacitaTotale: number
  prezzoBase: number
  attiva: boolean
  alloggiatiCodiceStruttura: string | null
  createdAt: Date
  updatedAt: Date
  [k: string]: unknown
}

export function createTestStruttura(overrides: Partial<TestStruttura> = {}): TestStruttura {
  return {
    id: 'strut-test-001',
    hostId: 'host-test-001',
    nome: 'Hotel Test Struttura',
    tipo: 'ALLOGGIO',
    citta: 'Roma',
    regione: 'Lazio',
    capacitaTotale: 20,
    prezzoBase: 80,
    attiva: true,
    alloggiatiCodiceStruttura: 'IT099001',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// ─── UnitaPrenotabile ────────────────────────────────────────────────────────

export type TestUnita = {
  id: string
  strutturaId: string
  nome: string
  capacita: number
  prezzoBase: number
  attiva: boolean
  statoHK: 'PULITA' | 'SPORCA' | 'IN_PULIZIA' | 'BLOCCATA'
  [k: string]: unknown
}

export function createTestUnita(overrides: Partial<TestUnita> = {}): TestUnita {
  return {
    id: 'unita-test-001',
    strutturaId: 'strut-test-001',
    nome: 'Camera Standard 101',
    capacita: 2,
    prezzoBase: 80,
    attiva: true,
    statoHK: 'PULITA',
    ...overrides,
  }
}

// ─── Prenotazione ────────────────────────────────────────────────────────────

export type TestPrenotazione = {
  id: string
  hostId: string
  strutturaId: string | null
  unitaId: string | null
  guestNome: string
  guestCognome: string
  guestEmail: string
  guestTelefono: string | null
  guestSesso: string | null
  guestDataNascita: Date | null
  guestComuneNascitaIstat: string | null
  guestProvinciaNascita: string | null
  guestStatoNascitaIstat: string | null
  guestCittadinanzaIstat: string | null
  guestTipoDocumento: string | null
  guestNumeroDocumento: string | null
  guestComuneRilascioIstat: string | null
  guestProvinciaRilascio: string | null
  guestLuogoNascita: string | null
  guestLuogoRilascio: string | null
  dataArrivo: Date
  dataPartenza: Date | null
  numOspiti: number
  stato: 'RICHIESTA' | 'CONFERMATA' | 'ANNULLATA' | 'COMPLETATA' | 'NO_SHOW'
  fonte: string | null
  prezzoTotale: number | null
  acconto: number | null
  tassaSoggiorno: number | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  [k: string]: unknown
}

export function createTestPrenotazione(overrides: Partial<TestPrenotazione> = {}): TestPrenotazione {
  return {
    id: 'pren-test-001',
    hostId: 'host-test-001',
    strutturaId: 'strut-test-001',
    unitaId: 'unita-test-001',
    guestNome: 'Mario',
    guestCognome: 'Rossi',
    guestEmail: 'mario.rossi@example.com',
    guestTelefono: '+393331234567',
    guestSesso: 'M',
    guestDataNascita: new Date('1985-06-15'),
    guestComuneNascitaIstat: 'H501',
    guestProvinciaNascita: 'RM',
    guestStatoNascitaIstat: '100000100', // Italia
    guestCittadinanzaIstat: '100000100',
    guestTipoDocumento: 'IDENTE',
    guestNumeroDocumento: 'CA12345AB',
    guestComuneRilascioIstat: 'H501',
    guestProvinciaRilascio: 'RM',
    guestLuogoNascita: 'Roma',
    guestLuogoRilascio: 'Roma',
    dataArrivo: new Date('2026-05-01'),
    dataPartenza: new Date('2026-05-04'),
    numOspiti: 2,
    stato: 'CONFERMATA',
    fonte: 'Diretto',
    prezzoTotale: 240,
    acconto: 50,
    tassaSoggiorno: 2,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

// ─── OspiteCRM ───────────────────────────────────────────────────────────────

export type TestOspiteCRM = {
  id: string
  hostId: string
  nome: string
  cognome: string
  email: string | null
  telefono: string | null
  lingua: string | null
  vip: boolean
  numSoggiorni: number
  totaleSpeso: number
  dataUltimoSoggiorno: Date | null
  createdAt: Date
  updatedAt: Date
  [k: string]: unknown
}

export function createTestOspiteCRM(overrides: Partial<TestOspiteCRM> = {}): TestOspiteCRM {
  return {
    id: 'ospite-test-001',
    hostId: 'host-test-001',
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario.rossi@example.com',
    telefono: '+393331234567',
    lingua: 'it',
    vip: false,
    numSoggiorni: 1,
    totaleSpeso: 240,
    dataUltimoSoggiorno: new Date('2026-05-04'),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// ─── AppuntamentoSpa ─────────────────────────────────────────────────────────

export type TestAppuntamentoSpa = {
  id: string
  hostId: string
  guestNome: string
  guestCognome: string | null
  guestEmail: string | null
  prenotazioneId: string | null
  cabinaId: string | null
  terapistaId: string | null
  trattamentoId: string | null
  dataOra: Date
  durata: number
  prezzoTotale: number | null
  stato: 'CONFERMATO' | 'PENDENTE' | 'CANCELLATO' | 'COMPLETATO'
  waiverObbligatorio: boolean
  checkInSpa: boolean
  createdAt: Date
  updatedAt: Date
  [k: string]: unknown
}

export function createTestAppuntamentoSpa(overrides: Partial<TestAppuntamentoSpa> = {}): TestAppuntamentoSpa {
  return {
    id: 'appt-test-001',
    hostId: 'host-test-001',
    guestNome: 'Mario',
    guestCognome: 'Rossi',
    guestEmail: 'mario.rossi@example.com',
    prenotazioneId: 'pren-test-001',
    cabinaId: 'cab-test-001',
    terapistaId: 'terap-test-001',
    trattamentoId: 'tratt-test-001',
    dataOra: new Date('2026-05-02T15:00:00Z'),
    durata: 60,
    prezzoTotale: 80,
    stato: 'CONFERMATO',
    waiverObbligatorio: true,
    checkInSpa: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// ─── WaiverSpa ───────────────────────────────────────────────────────────────

export type TestWaiverSpa = {
  id: string
  appuntamentoId: string
  firmaBase64: string | null
  zoneTrattate: string[]
  zoneEvitare: string[]
  incinta: boolean
  incintaMesi: number | null
  allergie: string | null
  patologie: string | null
  farmaci: string | null
  accettazioneTermini: boolean
  accettazionePrivacy: boolean
  consensoFoto: boolean
  dataRegistrazione: Date
  [k: string]: unknown
}

export function createTestWaiverSpa(overrides: Partial<TestWaiverSpa> = {}): TestWaiverSpa {
  return {
    id: 'waiver-test-001',
    appuntamentoId: 'appt-test-001',
    firmaBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSU',
    zoneTrattate: ['spalle', 'collo'],
    zoneEvitare: [],
    incinta: false,
    incintaMesi: null,
    allergie: null,
    patologie: null,
    farmaci: null,
    accettazioneTermini: true,
    accettazionePrivacy: true,
    consensoFoto: false,
    dataRegistrazione: now,
    ...overrides,
  }
}

// ─── Fattura ─────────────────────────────────────────────────────────────────

export type TestFattura = {
  id: string
  hostId: string
  numero: string
  anno: number
  stato: 'BOZZA' | 'INVIATA' | 'PAGATA' | 'SCADUTA' | 'ANNULLATA' | 'STORNATA'
  clienteNome: string
  clientePIva: string | null
  clienteCF: string | null
  clienteEmail: string | null
  righe: unknown
  imponibile: number
  iva: number
  totale: number
  aliquotaIva: number
  dataEmissione: Date
  dataScadenza: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  [k: string]: unknown
}

export function createTestFattura(overrides: Partial<TestFattura> = {}): TestFattura {
  return {
    id: 'fatt-test-001',
    hostId: 'host-test-001',
    numero: '2026/001',
    anno: 2026,
    stato: 'INVIATA',
    clienteNome: 'Mario Rossi',
    clientePIva: null,
    clienteCF: 'RSSMRA85H15H501Z',
    clienteEmail: 'mario.rossi@example.com',
    righe: [
      { descrizione: 'Soggiorno 3 notti', quantita: 3, prezzoUnitario: 80, iva: 10, totale: 240 },
    ],
    imponibile: 240,
    iva: 24,
    totale: 264,
    aliquotaIva: 10,
    dataEmissione: new Date('2026-05-05'),
    dataScadenza: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

// ─── RegolaTariffa + TariffaPeriodo (per test pricing) ──────────────────────

export function createTestRegolaTariffa(overrides: Partial<{
  id: string
  nome: string
  tipo: 'WEEKEND' | 'STAGIONE' | 'FESTIVO' | 'DURATA'
  attiva: boolean
  priorita: number
  modificatore: 'PERCENTUALE' | 'FISSO'
  valore: number
  unitaId: string | null
  meseInizio: number | null
  giornoInizio: number | null
  meseFine: number | null
  giornoFine: number | null
  giorniSettimana: number[]
}> = {}) {
  return {
    id: 'regola-test-001',
    nome: 'Regola Test',
    tipo: 'WEEKEND' as const,
    attiva: true,
    priorita: 10,
    modificatore: 'PERCENTUALE' as const,
    valore: 20,
    unitaId: null,
    meseInizio: null,
    giornoInizio: null,
    meseFine: null,
    giornoFine: null,
    giorniSettimana: [4, 5], // Ven, Sab (0=Lun convention del lib)
    ...overrides,
  }
}

export function createTestTariffaPeriodo(overrides: Partial<{
  nome: string
  colore: string | null
  prezzo: number
  dataInizio: Date | string
  dataFine: Date | string
}> = {}) {
  return {
    nome: 'Alta stagione',
    colore: '#ef4444',
    prezzo: 120,
    dataInizio: new Date('2026-07-01'),
    dataFine: new Date('2026-08-31'),
    ...overrides,
  }
}
