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

// ───────────────────────────────────────────────────────────────────────────
// calcolaSlotSpa — async, DB-loading (Prompt 11)
// ───────────────────────────────────────────────────────────────────────────

export interface SpaSlot {
  oraInizio: string           // "09:00"
  oraFine: string             // "09:50"
  terapistiDisponibili: string[]  // ids terapisti liberi per questo slot
  cabineDisponibili: string[]     // ids cabine libere per questo slot
}

/**
 * Calcola gli slot SPA disponibili per una data e durata specifica.
 * Slot da 08:00 a 20:00, intervallo 30 min.
 * Uno slot è disponibile se ha >= 1 terapista E >= 1 cabina liberi.
 *
 * Terapista libero nello slot se:
 *   - Ha DisponibilitaTerapista SETTIMANALE per quel giorno della settimana
 *     che copre l'intero slot (orarioInizio <= slotStart, orarioFine >= slotEnd)
 *   - OPPURE ha DisponibilitaTerapista SPECIFICA per quella data esatta
 *   - E NON è bloccato (BLOCCO che copre lo slot)
 *   - E NON ha AppuntamentoSpa (CONFERMATO/PENDENTE) sovrapposto
 *
 * Cabina libera nello slot se:
 *   - Nessun AppuntamentoSpa (CONFERMATO/PENDENTE) sovrapposto
 *     incluso il buffer di pulizia post-appuntamento (durataPuliziaMinuti)
 */
export async function calcolaSlotSpa(opts: {
  hostId: string
  data: Date
  durata: number   // minuti trattamento
  startHour?: number  // default 8
  endHour?: number    // default 20
  intervalMin?: number // default 30
}): Promise<SpaSlot[]> {
  const { prisma } = await import('@/lib/db')
  const { hostId, data, durata } = opts
  const startHour = opts.startHour ?? 8
  const endHour = opts.endHour ?? 20
  const intervalMin = opts.intervalMin ?? 30

  // Giorno settimana (0=Lun..6=Dom, convenzione lib)
  const jsDay = data.getDay() // 0=Dom..6=Sab
  const giornoLib = jsDay === 0 ? 6 : jsDay - 1

  const dataInizio = new Date(data)
  dataInizio.setHours(0, 0, 0, 0)
  const dataFine = new Date(dataInizio)
  dataFine.setDate(dataFine.getDate() + 1)

  // 1. Carica terapisti, cabine e appuntamenti in parallelo
  const [terapisti, cabine, appuntamentiGiorno] = await Promise.all([
    prisma.terapistaSpa.findMany({
      where: { hostId, attivo: true },
      select: { id: true, disponibilita: { where: { attiva: true } } },
    }),
    prisma.cabinaSpa.findMany({
      where: { hostId, attiva: true },
      select: { id: true, durataPuliziaMinuti: true },
    }),
    prisma.appuntamentoSpa.findMany({
      where: {
        hostId,
        stato: { in: ['CONFERMATO', 'PRENOTATO'] },
        dataOra: { gte: dataInizio, lt: dataFine },
      },
      select: { terapistaId: true, cabinaId: true, dataOra: true, durata: true },
    }),
  ])

  // 2. Converti appuntamenti in occupazione (minuti dal giorno)
  const occupazioniAppt = appuntamentiGiorno.map(a => {
    const h = a.dataOra.getHours()
    const m = a.dataOra.getMinutes()
    const inizio = h * 60 + m
    return { inizioMin: inizio, fineMin: inizio + a.durata, terapistaId: a.terapistaId, cabinaId: a.cabinaId }
  })

  // 3. Genera tutti gli slot del giorno
  const slots = generaSlotGiornata({ startHour, endHour, intervalMin, durataMin: durata })

  return slots.map(slot => {
    // Terapisti disponibili
    const terapistiLiberi = terapisti.filter(t => {
      const disp = t.disponibilita

      // Verifica se bloccato (BLOCCO che copre lo slot)
      const bloccato = disp.some(d => {
        if (d.tipo !== 'BLOCCO') return false
        // BLOCCO è per data specifica
        if (d.data && !sameDate(d.data, data)) return false
        return fasciaCopreSlot(d.orarioInizio, d.orarioFine, slot.inizioMin, slot.fineMin)
      })
      if (bloccato) return false

      // Ha disponibilità SETTIMANALE o SPECIFICA che copre lo slot
      const haFascia = disp.some(d => {
        if (d.tipo === 'SETTIMANALE') {
          return d.giorno === giornoLib && fasciaCopreSlot(d.orarioInizio, d.orarioFine, slot.inizioMin, slot.fineMin)
        }
        if (d.tipo === 'SPECIFICA') {
          return d.data != null && sameDate(d.data, data) && fasciaCopreSlot(d.orarioInizio, d.orarioFine, slot.inizioMin, slot.fineMin)
        }
        return false
      })
      if (!haFascia) return false

      // Non ha appuntamenti sovrapposti
      const occupato = occupazioniAppt.some(
        o => o.terapistaId === t.id && slotsOverlap(o.inizioMin, o.fineMin, slot.inizioMin, slot.fineMin)
      )
      return !occupato
    })

    // Cabine disponibili (con buffer pulizia)
    const cabineLibere = cabine.filter(c => {
      return !occupazioniAppt.some(o => {
        if (o.cabinaId !== c.id) return false
        // Slot cabina = [oraInizio, oraInizio + durata + buffer)
        const fineConBuffer = o.fineMin + c.durataPuliziaMinuti
        return slotsOverlap(o.inizioMin, fineConBuffer, slot.inizioMin, slot.fineMin)
      })
    })

    return {
      oraInizio: slot.oraInizio,
      oraFine: slot.oraFine,
      terapistiDisponibili: terapistiLiberi.map(t => t.id),
      cabineDisponibili: cabineLibere.map(c => c.id),
    }
  }).filter(s => s.terapistiDisponibili.length > 0 && s.cabineDisponibili.length > 0)
}

/**
 * Assegna la prima cabina libera per un dato orario e durata.
 * Considera il buffer di pulizia degli appuntamenti precedenti.
 */
export async function assegnaCabina(opts: {
  hostId: string
  dataOra: Date
  durata: number
}): Promise<string | null> {
  const { prisma } = await import('@/lib/db')
  const { hostId, dataOra, durata } = opts

  const dataInizio = new Date(dataOra)
  dataInizio.setHours(0, 0, 0, 0)
  const dataFine = new Date(dataInizio)
  dataFine.setDate(dataFine.getDate() + 1)

  const h = dataOra.getHours()
  const m = dataOra.getMinutes()
  const slotInizio = h * 60 + m
  const slotFine = slotInizio + durata

  const [cabine, appuntamenti] = await Promise.all([
    prisma.cabinaSpa.findMany({
      where: { hostId, attiva: true },
      select: { id: true, durataPuliziaMinuti: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.appuntamentoSpa.findMany({
      where: {
        hostId,
        stato: { in: ['CONFERMATO', 'PRENOTATO'] },
        dataOra: { gte: dataInizio, lt: dataFine },
      },
      select: { cabinaId: true, dataOra: true, durata: true },
    }),
  ])

  const occupazioni = appuntamenti.map(a => {
    const ah = a.dataOra.getHours()
    const am = a.dataOra.getMinutes()
    const ini = ah * 60 + am
    return { cabinaId: a.cabinaId, inizioMin: ini, fineMin: ini + a.durata }
  })

  for (const cabina of cabine) {
    const occupata = occupazioni.some(o => {
      if (o.cabinaId !== cabina.id) return false
      const fineConBuffer = o.fineMin + cabina.durataPuliziaMinuti
      return slotsOverlap(o.inizioMin, fineConBuffer, slotInizio, slotFine)
    })
    if (!occupata) return cabina.id
  }

  return null
}

// helper locale (non esportato)
function sameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
