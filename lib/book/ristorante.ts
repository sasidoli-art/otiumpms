/**
 * Logica condivisa booking ristorante pubblico (/book/[strutturaId]/ristorante).
 *
 * - Genera gli slot di 30 minuti dalle configurazioni ConfigPastoStruttura
 *   (tipi PRANZO e CENA). La COLAZIONE e` esclusa: per quella gli ospiti
 *   in-house usano il flusso scelta pasti, non una prenotazione tavolo.
 * - Calcola la disponibilita` residua di coperti per slot, aggregando
 *   le PrenotazioneRistorante sovrapposte.
 */

import { prisma } from '@/lib/db'

// ────────────────────────────────────────────────────────────────────────────
// Tipi
// ────────────────────────────────────────────────────────────────────────────

export type RistoranteSlotConfig = {
  tipoPasto: 'PRANZO' | 'CENA'
  orarioInizio: string // "19:00"
  orarioFine: string // "22:30"
  maxCoperti: number | null // null = illimitato
  luogo: string | null
}

export type RistoranteSlot = {
  ora: string // "19:00"
  disponibile: boolean // puo` essere prenotato con il numero richiesto
  copertiResidui: number | null // null se maxCoperti illimitato
  tipoPasto: 'PRANZO' | 'CENA'
}

export const SLOT_DURATION_MIN = 30
// Durata default di un servizio tavolo — usata per calcolare quali prenotazioni
// "occupano" ancora il tavolo in un dato slot. 90 minuti e` la stima media per un pasto.
export const PERMANENZA_DEFAULT_MIN = 90

// ────────────────────────────────────────────────────────────────────────────
// Config loader
// ────────────────────────────────────────────────────────────────────────────

export async function getRistoranteConfig(strutturaId: string): Promise<RistoranteSlotConfig[]> {
  const configs = await prisma.configPastoStruttura.findMany({
    where: {
      strutturaId,
      disponibile: true,
      tipoPasto: { in: ['PRANZO', 'CENA'] },
      orarioInizio: { not: null },
      orarioFine: { not: null },
    },
    select: {
      tipoPasto: true,
      orarioInizio: true,
      orarioFine: true,
      maxCoperti: true,
      luogo: true,
    },
    orderBy: { orarioInizio: 'asc' },
  })

  return configs
    .filter((c) => c.orarioInizio && c.orarioFine)
    .map((c) => ({
      tipoPasto: c.tipoPasto as 'PRANZO' | 'CENA',
      orarioInizio: c.orarioInizio!,
      orarioFine: c.orarioFine!,
      maxCoperti: c.maxCoperti,
      luogo: c.luogo,
    }))
}

// ────────────────────────────────────────────────────────────────────────────
// Slot generation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Genera le ore slot (HH:mm) per una fascia, a step di SLOT_DURATION_MIN.
 * Ultimo slot consentito = orarioFine - SLOT_DURATION_MIN (no prenotazione
 * a ridosso della chiusura).
 */
export function generateSlotHours(inizio: string, fine: string): string[] {
  const startMin = parseHHMM(inizio)
  const endMin = parseHHMM(fine)
  if (startMin == null || endMin == null || endMin <= startMin) return []

  const slots: string[] = []
  for (let m = startMin; m <= endMin - SLOT_DURATION_MIN; m += SLOT_DURATION_MIN) {
    slots.push(formatHHMM(m))
  }
  return slots
}

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2])
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null
  return h * 60 + mm
}

function formatHHMM(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ────────────────────────────────────────────────────────────────────────────
// Disponibilita` per giorno
// ────────────────────────────────────────────────────────────────────────────

/**
 * Combina una data (YYYY-MM-DD) + un orario (HH:mm) in un `Date` locale.
 * NB: usa fuso locale del server — per deploy Vercel e` UTC ma l'orario
 * viene interpretato come "orario locale della struttura"; e` accettabile
 * perche` non facciamo aritmetica cross-timezone qui (resta del giorno).
 */
export function combineDateTime(dataYMD: string, oraHHMM: string): Date {
  const [y, mo, d] = dataYMD.split('-').map(Number)
  const mm = parseHHMM(oraHHMM)!
  const h = Math.floor(mm / 60)
  const min = mm % 60
  return new Date(y, (mo ?? 1) - 1, d ?? 1, h, min, 0, 0)
}

/**
 * Calcola, per ogni slot della data, quanti coperti sono gia` prenotati in
 * una finestra di sovrapposizione (slot inizio → slot inizio + permanenza).
 * Ritorna: slot ordinati cronologicamente con flag di disponibilita`.
 */
export async function getSlotsDisponibilita(opts: {
  strutturaId: string
  dataYMD: string
  numPersone: number
}): Promise<{ slots: RistoranteSlot[]; configs: RistoranteSlotConfig[] }> {
  const { strutturaId, dataYMD, numPersone } = opts
  const configs = await getRistoranteConfig(strutturaId)
  if (configs.length === 0) return { slots: [], configs: [] }

  // Range giornata per caricare tutte le prenotazioni del giorno in una sola query
  const giorno = combineDateTime(dataYMD, '00:00')
  const giornoDopo = new Date(giorno)
  giornoDopo.setDate(giornoDopo.getDate() + 1)

  const prenotazioniDelGiorno = await prisma.prenotazioneRistorante.findMany({
    where: {
      strutturaId,
      dataOra: { gte: giorno, lt: giornoDopo },
      stato: { in: ['CONFERMATA', 'COMPLETATA'] }, // annullate / no_show liberano il tavolo
    },
    select: { dataOra: true, numPersone: true },
  })

  const slots: RistoranteSlot[] = []
  for (const cfg of configs) {
    const ore = generateSlotHours(cfg.orarioInizio, cfg.orarioFine)
    for (const ora of ore) {
      const slotStart = combineDateTime(dataYMD, ora)
      const slotEnd = new Date(slotStart.getTime() + PERMANENZA_DEFAULT_MIN * 60_000)

      // Coperti occupati in questo slot = somma delle prenotazioni la cui
      // "finestra di occupazione" [dataOra, dataOra+permanenza) si sovrappone allo slot
      let occupati = 0
      for (const p of prenotazioniDelGiorno) {
        const pStart = p.dataOra
        const pEnd = new Date(pStart.getTime() + PERMANENZA_DEFAULT_MIN * 60_000)
        if (pStart < slotEnd && pEnd > slotStart) {
          occupati += p.numPersone
        }
      }

      const max = cfg.maxCoperti
      const copertiResidui = max == null ? null : Math.max(0, max - occupati)
      const disponibile = max == null ? true : copertiResidui! >= numPersone

      slots.push({
        ora,
        disponibile,
        copertiResidui,
        tipoPasto: cfg.tipoPasto,
      })
    }
  }

  // Sort cronologico (PRANZO di solito precede CENA, ma piu` sicuro ordinare)
  slots.sort((a, b) => a.ora.localeCompare(b.ora))
  return { slots, configs }
}
