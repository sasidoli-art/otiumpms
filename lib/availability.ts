/**
 * lib/availability.ts — calcolo disponibilità unità prenotabili (P3.1).
 *
 * Estrae la logica oggi inline in `app/api/book/.../camere/disponibilita/route.ts`
 * e in `.../prenota/route.ts` per renderla:
 *   - testabile (unit test deterministici)
 *   - riusabile (booking pubblico, prenotazione manuale host, calendario,
 *     check conflitti su modifica)
 *   - centralizzata (un solo posto dove definire "cosa rende un'unità non
 *     disponibile in una data")
 *
 * Una camera È OCCUPATA in un giorno se VERA almeno una di queste:
 *   1. Ha una `Prenotazione` (CONFERMATA o RICHIESTA) che si sovrappone
 *   2. Ha un `PrenotazioneCanale` (blocco OTA importato via iCal) che si sovrappone
 *   3. Ha un record `Disponibilita` con `chiuso=true` su quel giorno
 *   4. Ha un record `Disponibilita` con `postiOccupati >= postiDisponibili`
 *   5. (opzionale) Ha una `SegnalazioneManutenzione` URGENTE aperta sull'unità
 *
 * Convenzioni:
 *   - Le date sono Date object con tempo locale 00:00:00.
 *   - Range half-open [arrivo, partenza): il giorno di partenza NON e` occupato
 *     (stesso pattern di hotel: check-out la mattina = stanza libera quel giorno).
 */
import { prisma } from './db'

export type MotivoNonDisponibile =
  | 'prenotata'      // Prenotazione interna (CONFERMATA/RICHIESTA)
  | 'blocco_ota'     // PrenotazioneCanale (Booking, Airbnb, ...)
  | 'chiusa'         // Disponibilita.chiuso = true
  | 'esaurita'       // Disponibilita.postiOccupati >= postiDisponibili
  | 'manutenzione'   // SegnalazioneManutenzione URGENTE aperta

export interface SlotDisponibilita {
  unitaId: string
  unitaNome: string
  disponibile: boolean
  motivo?: MotivoNonDisponibile
  prenotazioneId?: string
  canaleNome?: string
}

export interface DisponibilitaGiornaliera {
  data: string // YYYY-MM-DD
  slotPerUnita: SlotDisponibilita[]
  unitaLibere: number
  unitaOccupate: number
  unitaChiuse: number
}

export interface CalcolaDisponibilitaParams {
  strutturaId: string
  hostId: string
  dataInizio: Date
  dataFine: Date         // esclusiva (giorno di check-out non incluso)
  unitaId?: string       // se passato, filtra una sola unità
  escludiPrenotazioneId?: string  // utile in update: esclude la prenotazione corrente
  considerareManutenzione?: boolean // default false (manutenzione = avviso, non blocco hard)
}

// ───────────────────────────────────────────────────────────────────────────
// Calcolo principale
// ───────────────────────────────────────────────────────────────────────────

export async function calcolaDisponibilita(
  params: CalcolaDisponibilitaParams,
): Promise<DisponibilitaGiornaliera[]> {
  const { strutturaId, hostId, dataInizio, dataFine, unitaId, escludiPrenotazioneId } = params

  // 1. Unità coinvolte
  const unita = await prisma.unitaPrenotabile.findMany({
    where: {
      strutturaId,
      attiva: true,
      ...(unitaId ? { id: unitaId } : {}),
    },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  if (unita.length === 0) return []

  const unitaIds = unita.map((u) => u.id)

  // 2. Prenotazioni interne sovrapposte
  // Range half-open: dataArrivo < dataFine AND dataPartenza > dataInizio
  // (Se dataPartenza è null, la trattiamo come single-day = arrivo)
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId,
      strutturaId,
      stato: { in: ['CONFERMATA', 'RICHIESTA'] },
      ...(escludiPrenotazioneId ? { NOT: { id: escludiPrenotazioneId } } : {}),
      unitaId: { in: unitaIds },
      dataArrivo: { lt: dataFine },
      OR: [
        { dataPartenza: null, dataArrivo: { gte: dataInizio } },
        { dataPartenza: { gt: dataInizio } },
      ],
    },
    select: {
      id: true,
      unitaId: true,
      dataArrivo: true,
      dataPartenza: true,
    },
  })

  // 3. Blocchi OTA via PrenotazioneCanale (importati da iCal).
  // PrenotazioneCanale non ha unitaId/hostId diretti → join via canale.
  // Un canale con `unitaId = null` blocca TUTTE le unita` della struttura.
  const blocchiOtaRaw = await prisma.prenotazioneCanale.findMany({
    where: {
      canale: {
        strutturaId,
        struttura: { hostId },
        OR: [{ unitaId: { in: unitaIds } }, { unitaId: null }],
      },
      dataInizio: { lt: dataFine },
      dataFine: { gt: dataInizio },
    },
    select: {
      dataInizio: true,
      dataFine: true,
      canale: { select: { nome: true, unitaId: true } },
    },
  })
  // Espandi i blocchi struttura-wide a tutte le unita`
  const blocchiOta: Array<{ unitaId: string; dataInizio: Date; dataFine: Date; canaleNome: string }> = []
  for (const b of blocchiOtaRaw) {
    const targetUnits = b.canale.unitaId ? [b.canale.unitaId] : unitaIds
    for (const uid of targetUnits) {
      blocchiOta.push({
        unitaId: uid,
        dataInizio: b.dataInizio,
        dataFine: b.dataFine,
        canaleNome: b.canale.nome,
      })
    }
  }

  // 4. Override Disponibilita (chiusura/saturazione manuale)
  const overrideDisp = await prisma.disponibilita.findMany({
    where: {
      unitaId: { in: unitaIds },
      data: { gte: dataInizio, lt: dataFine },
    },
    select: {
      unitaId: true,
      data: true,
      chiuso: true,
      postiDisponibili: true,
      postiOccupati: true,
    },
  })

  // 5. Manutenzione urgente (opt-in)
  const manutenzioniSet = new Set<string>()
  if (params.considerareManutenzione) {
    const manut = await prisma.segnalazioneManutenzione.findMany({
      where: {
        hostId,
        stato: { in: ['APERTA', 'IN_LAVORAZIONE'] },
        priorita: 'URGENTE',
        unitaId: { in: unitaIds },
      },
      select: { unitaId: true },
    })
    for (const m of manut) {
      if (m.unitaId) manutenzioniSet.add(m.unitaId)
    }
  }

  // 6. Costruisci la mappa giorno per giorno
  const out: DisponibilitaGiornaliera[] = []
  for (const giorno of enumGiorni(dataInizio, dataFine)) {
    const dataStr = formatYMD(giorno)
    const slots: SlotDisponibilita[] = []

    for (const u of unita) {
      // Manutenzione urgente
      if (manutenzioniSet.has(u.id)) {
        slots.push({ unitaId: u.id, unitaNome: u.nome, disponibile: false, motivo: 'manutenzione' })
        continue
      }

      // Override chiusura/saturazione
      const ov = overrideDisp.find((o) => o.unitaId === u.id && sameDay(o.data, giorno))
      if (ov?.chiuso) {
        slots.push({ unitaId: u.id, unitaNome: u.nome, disponibile: false, motivo: 'chiusa' })
        continue
      }
      if (ov && ov.postiOccupati >= ov.postiDisponibili) {
        slots.push({ unitaId: u.id, unitaNome: u.nome, disponibile: false, motivo: 'esaurita' })
        continue
      }

      // Prenotazione interna
      const pren = prenotazioni.find((p) => {
        if (p.unitaId !== u.id) return false
        const arr = startOfDay(p.dataArrivo)
        const part = p.dataPartenza ? startOfDay(p.dataPartenza) : addDays(arr, 1)
        return giorno >= arr && giorno < part
      })
      if (pren) {
        slots.push({
          unitaId: u.id,
          unitaNome: u.nome,
          disponibile: false,
          motivo: 'prenotata',
          prenotazioneId: pren.id,
        })
        continue
      }

      // Blocco OTA
      const blocco = blocchiOta.find((b) => {
        if (b.unitaId !== u.id) return false
        const i = startOfDay(b.dataInizio)
        const f = startOfDay(b.dataFine)
        return giorno >= i && giorno < f
      })
      if (blocco) {
        slots.push({
          unitaId: u.id,
          unitaNome: u.nome,
          disponibile: false,
          motivo: 'blocco_ota',
          canaleNome: blocco.canaleNome,
        })
        continue
      }

      slots.push({ unitaId: u.id, unitaNome: u.nome, disponibile: true })
    }

    out.push({
      data: dataStr,
      slotPerUnita: slots,
      unitaLibere: slots.filter((s) => s.disponibile).length,
      unitaOccupate: slots.filter((s) => !s.disponibile && s.motivo !== 'chiusa').length,
      unitaChiuse: slots.filter((s) => s.motivo === 'chiusa').length,
    })
  }

  return out
}

// ───────────────────────────────────────────────────────────────────────────
// Helper: verifica disponibilità per una singola prenotazione
// ───────────────────────────────────────────────────────────────────────────

export interface VerificaDisponibilitaParams {
  unitaId: string
  hostId: string
  strutturaId: string
  dataArrivo: Date
  dataPartenza: Date
  escludiPrenotazioneId?: string
}

export async function verificaDisponibilitaPrenotazione(
  params: VerificaDisponibilitaParams,
): Promise<{ disponibile: boolean; giorniOccupati: string[] }> {
  const matrix = await calcolaDisponibilita({
    strutturaId: params.strutturaId,
    hostId: params.hostId,
    dataInizio: params.dataArrivo,
    dataFine: params.dataPartenza,
    unitaId: params.unitaId,
    escludiPrenotazioneId: params.escludiPrenotazioneId,
  })

  const giorniOccupati: string[] = []
  for (const giorno of matrix) {
    const slot = giorno.slotPerUnita.find((s) => s.unitaId === params.unitaId)
    if (slot && !slot.disponibile) {
      giorniOccupati.push(giorno.data)
    }
  }

  return {
    disponibile: giorniOccupati.length === 0,
    giorniOccupati,
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Date utilities (no dipendenza da date-fns per essere import-leggero)
// ───────────────────────────────────────────────────────────────────────────

export function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

export function addDays(d: Date, n: number): Date {
  const out = startOfDay(d)
  out.setDate(out.getDate() + n)
  return out
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function* enumGiorni(start: Date, endExcl: Date): Generator<Date> {
  const cur = startOfDay(start)
  const end = startOfDay(endExcl)
  while (cur < end) {
    yield new Date(cur)
    cur.setDate(cur.getDate() + 1)
  }
}
