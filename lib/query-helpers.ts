/**
 * Query helpers per Prisma — SELECT mirati + paginazione + date ranges.
 *
 * Motivazione: caricare 60+ campi di `Prenotazione` quando ne servono 10
 * spreca RAM, bandwidth e CPU di serializzazione. Questi `satisfies`
 * garantiscono che i SELECT siano coerenti tra API routes.
 */

import { Prisma } from '@prisma/client'
import { startOfDay, endOfDay } from 'date-fns'

// ─── Prenotazione ────────────────────────────────────────────────────────────

/**
 * Campi essenziali per liste (dashboard, ospiti di oggi, calendario).
 * ~12 campi invece di 60+.
 */
export const PRENOTAZIONE_LISTA_SELECT = {
  id: true,
  guestNome: true,
  guestCognome: true,
  guestEmail: true,
  guestTelefono: true,
  dataArrivo: true,
  dataPartenza: true,
  stato: true,
  statoCheckIn: true,
  numOspiti: true,
  prezzoTotale: true,
  fonte: true,
  unita: { select: { id: true, nome: true } },
  struttura: { select: { id: true, nome: true } },
  createdAt: true,
} satisfies Prisma.PrenotazioneSelect

/** Campi minimi per il calendario (colonne × giorni × unità). */
export const PRENOTAZIONE_CALENDARIO_SELECT = {
  id: true,
  unitaId: true,
  guestNome: true,
  guestCognome: true,
  dataArrivo: true,
  dataPartenza: true,
  stato: true,
  statoCheckIn: true,
  numOspiti: true,
} satisfies Prisma.PrenotazioneSelect

/** Dettaglio completo — lazy, solo per detail page. */
export const PRENOTAZIONE_DETTAGLIO_INCLUDE = {
  unita: true,
  struttura: { select: { id: true, nome: true, citta: true } },
  accompagnatori: true,
  addebiti: true,
  appuntamentiSpa: { include: { trattamento: true } },
  incassi: true,
  pagamentiCheckout: true,
  alertOspite: { where: { attivo: true } },
  pianoPasto: true,
  host: { select: { id: true, nomeAzienda: true, emailMittente: true } },
} satisfies Prisma.PrenotazioneInclude

// ─── Ospite CRM ──────────────────────────────────────────────────────────────

export const OSPITE_LISTA_SELECT = {
  id: true,
  nome: true,
  cognome: true,
  email: true,
  telefono: true,
  lingua: true,
  vip: true,
  numSoggiorni: true,
  totaleSpeso: true,
  dataUltimoSoggiorno: true,
  createdAt: true,
} satisfies Prisma.OspiteCRMSelect

// ─── AppuntamentoSpa ─────────────────────────────────────────────────────────

export const APPUNTAMENTO_LISTA_SELECT = {
  id: true,
  guestNome: true,
  guestCognome: true,
  guestEmail: true,
  dataOra: true,
  durata: true,
  prezzoTotale: true,
  stato: true,
  waiverObbligatorio: true,
  checkInSpa: true,
  trattamento: { select: { id: true, nome: true, categoria: true } },
  terapista: { select: { id: true, nome: true, cognome: true } },
  cabina: { select: { id: true, nome: true } },
  prenotazioneId: true,
} satisfies Prisma.AppuntamentoSpaSelect

// ─── Fattura ─────────────────────────────────────────────────────────────────

export const FATTURA_LISTA_SELECT = {
  id: true,
  numero: true,
  anno: true,
  stato: true,
  clienteNome: true,
  clientePIva: true,
  imponibile: true,
  iva: true,
  totale: true,
  dataEmissione: true,
  dataScadenza: true,
  createdAt: true,
} satisfies Prisma.FatturaSelect

// ─── Helpers paginazione / date ──────────────────────────────────────────────

/**
 * Paginazione 1-based standard. `page=1` → skip=0.
 * Cap `pageSize` a 100 per evitare query troppo grandi.
 */
export function paginazione(page: number, pageSize: number = 20) {
  const p = Math.max(1, Math.floor(page))
  const s = Math.min(100, Math.max(1, Math.floor(pageSize)))
  return { skip: (p - 1) * s, take: s }
}

/**
 * Range date inclusivo di entrambe le estremità ([da, a]).
 * Per query BETWEEN: `{ createdAt: dateRange(da, a) }`.
 */
export function dateRange(da: Date, a: Date): { gte: Date; lte: Date } {
  return { gte: startOfDay(da), lte: endOfDay(a) }
}

/**
 * Range date esclusivo a destra ([da, a)) — per BETWEEN su checkout:
 * include prenotazioni con checkout il giorno dopo ma non oltre.
 */
export function dateRangeExclusive(da: Date, a: Date): { gte: Date; lt: Date } {
  return { gte: startOfDay(da), lt: startOfDay(a) }
}

/**
 * Prenotazioni che "toccano" un range [da, a]: arrivo prima di a E partenza dopo da.
 * Utile per calendario, disponibilità, analytics per periodo.
 */
export function prenotazioneOverlapsRange(da: Date, a: Date) {
  return {
    dataArrivo: { lt: endOfDay(a) },
    OR: [
      { dataPartenza: null, dataArrivo: { gte: startOfDay(da) } },
      { dataPartenza: { gt: startOfDay(da) } },
    ],
  } satisfies Prisma.PrenotazioneWhereInput
}

/**
 * Prenotazioni CONFERMATA o COMPLETATA, soft-delete escluso.
 * Pattern usato in occupancy/analytics/revenue.
 */
export const PRENOTAZIONE_ATTIVE_WHERE = {
  deletedAt: null,
  stato: { in: ['CONFERMATA', 'COMPLETATA'] as const },
} satisfies Prisma.PrenotazioneWhereInput
