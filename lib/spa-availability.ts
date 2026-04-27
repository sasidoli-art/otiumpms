/**
 * lib/spa-availability.ts — slot SPA generator + overlap utilities (P5.1).
 *
 * Estrae la logica oggi inline in `app/api/book/.../spa/disponibilita/route.ts`.
 * Lo slot generator e` puro (no DB) — testabile direttamente. La funzione
 * `calcolaSlotSpa` che integra Prisma resta nel route fino a quando non serve
 * riusarla (per ora un solo call site).
 *
 * Modello mentale dello slot SPA:
 *   - Genero slot ogni `intervalMin` (default 30) da `startHour` a `endHour`.
 *   - Per ogni slot serve almeno UN terapista E UNA cabina liberi nello stesso
 *     intervallo `[oraInizio, oraInizio + durata)`.
 *   - "Libero" = niente appuntamento sovrapposto + terapista lavora in quella
 *     fascia oraria + cabina considera tempo pulizia post-appuntamento precedente.
 */

// ───────────────────────────────────────────────────────────────────────────
// Time primitives (puro, no DB, no date-fns)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Converte "HH:MM" in minuti dall'inizio della giornata.
 * Throw su input malformato (l'HHMM viene da DB / select fissi, deve sempre
 * essere valido — fallire forte e` meglio che ritornare NaN silenziosi).
 */
export function toMinutes(hhmm: string): number {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) throw new Error(`toMinutes: formato non valido "${hhmm}"`)
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 24 || min < 0 || min > 59) {
    throw new Error(`toMinutes: ora fuori range "${hhmm}"`)
  }
  return h * 60 + min
}

/** Converte minuti in "HH:MM" zero-padded. */
export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * True se due intervalli `[aStart, aEnd)` e `[bStart, bEnd)` si sovrappongono.
 * Usa range half-open: tocco esatto fine A = inizio B → NON sovrapposto
 * (consistente con il modello "checkout libera lo slot").
 */
export function slotsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart
}

// ───────────────────────────────────────────────────────────────────────────
// Slot generator (puro)
// ───────────────────────────────────────────────────────────────────────────

export interface SlotTime {
  oraInizio: string  // "09:00"
  oraFine: string    // "09:50"
  inizioMin: number
  fineMin: number
}

export interface GeneraSlotParams {
  startHour: number  // 8 = 08:00
  endHour: number    // 20 = 20:00 (esclusivo: l'ultimo slot termina entro endHour)
  intervalMin: number // 30 di solito
  durataMin: number  // durata trattamento (es. 50)
}

/**
 * Genera slot di un giorno SPA. Solo gli slot che terminano entro `endHour`
 * vengono inclusi (un trattamento da 50 min con endHour=20 puo` partire al
 * massimo alle 19:10).
 *
 * Esempio: startHour=9, endHour=11, interval=30, durata=50:
 *   → 09:00→09:50, 09:30→10:20, 10:00→10:50  (10:30→11:20 escluso)
 */
export function generaSlotGiornata({
  startHour, endHour, intervalMin, durataMin,
}: GeneraSlotParams): SlotTime[] {
  if (startHour < 0 || startHour >= 24) throw new Error('startHour fuori range')
  if (endHour <= startHour || endHour > 24) throw new Error('endHour <= startHour o > 24')
  if (intervalMin <= 0 || durataMin <= 0) throw new Error('interval e durata positivi')

  const out: SlotTime[] = []
  const startMin = startHour * 60
  const endMin = endHour * 60

  for (let m = startMin; m + durataMin <= endMin; m += intervalMin) {
    out.push({
      oraInizio: toHHMM(m),
      oraFine: toHHMM(m + durataMin),
      inizioMin: m,
      fineMin: m + durataMin,
    })
  }
  return out
}

// ───────────────────────────────────────────────────────────────────────────
// Overlap check su array di appuntamenti (puro)
// ───────────────────────────────────────────────────────────────────────────

export interface AppuntamentoOccupazione {
  inizioMin: number   // minuti dall'inizio della giornata
  fineMin: number     // inizioMin + durata
  terapistaId?: string | null
  cabinaId?: string | null
}

/**
 * Filtra gli appuntamenti che si sovrappongono al [slotStart, slotEnd).
 * Utile per derivare set di terapisti/cabine occupati in uno slot specifico.
 */
export function appuntamentiSovrapposti(
  appuntamenti: AppuntamentoOccupazione[],
  slotInizio: number,
  slotFine: number,
): AppuntamentoOccupazione[] {
  return appuntamenti.filter((a) => slotsOverlap(a.inizioMin, a.fineMin, slotInizio, slotFine))
}

/**
 * True se la fascia oraria del terapista (es. "09:00"-"13:00") copre
 * INTERAMENTE lo slot richiesto. Half-open: slot 13:00-13:50 NON e` coperto
 * da fascia 09:00-13:00 (la fascia finisce esattamente quando lo slot inizia).
 */
export function fasciaCopreSlot(
  fasciaInizio: string,
  fasciaFine: string,
  slotInizioMin: number,
  slotFineMin: number,
): boolean {
  const fIni = toMinutes(fasciaInizio)
  const fFin = toMinutes(fasciaFine)
  return fIni <= slotInizioMin && fFin >= slotFineMin
}
