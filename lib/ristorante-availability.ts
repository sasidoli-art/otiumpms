/**
 * lib/ristorante-availability.ts — disponibilità slot ristorante (Prompt 12).
 *
 * Ogni slot copre `intervalloSlot` minuti. Un posto è occupato se esiste una
 * prenotazione CONFERMATA con dataOra entro ±intervalloSlot minuti dallo slot
 * (finestra di "occupazione tavolo" — es. chi prenota 12:30 occupa il tavolo
 * almeno fino alle 13:00, quindi conta per lo slot delle 13:00 se l'intervallo
 * è 30 min).
 */

export interface RistoranteSlot {
  ora: string             // "12:30"
  copertiDisponibili: number
  copertiOccupati: number
}

export interface CalcolaSlotRistoranteInput {
  oraApertura: string    // "12:00"
  oraChiusura: string    // "22:00"
  intervalloSlot: number // minuti tra slot (es. 30)
  maxCopertiPerSlot: number
  giorniChiusura: number[] // 0=lun..6=dom
  dataGiorno: Date
  numPersone: number
  prenotazioni: Array<{ dataOra: Date; numPersone: number; stato: string }>
}

// ─── Pure core (testabile senza DB) ───────────────────────────────────────

export function calcolaSlotRistoranteFromData(
  input: CalcolaSlotRistoranteInput,
): RistoranteSlot[] {
  const { oraApertura, oraChiusura, intervalloSlot, maxCopertiPerSlot, giorniChiusura, dataGiorno, numPersone, prenotazioni } = input

  // Giorno della settimana (0=lun..6=dom, conv. lib)
  const jsDay = dataGiorno.getDay()
  const giornoLib = jsDay === 0 ? 6 : jsDay - 1

  if (giorniChiusura.includes(giornoLib)) return []

  const aprMin = toMinutes(oraApertura)
  const chiuMin = toMinutes(oraChiusura)

  // Filtra solo prenotazioni CONFERMATA del giorno
  const confermateGiorno = prenotazioni.filter(p => {
    if (p.stato !== 'CONFERMATA') return false
    const d = p.dataOra
    return d.getFullYear() === dataGiorno.getFullYear() &&
      d.getMonth() === dataGiorno.getMonth() &&
      d.getDate() === dataGiorno.getDate()
  })

  const out: RistoranteSlot[] = []
  for (let m = aprMin; m < chiuMin; m += intervalloSlot) {
    const ora = toHHMM(m)
    // Conta coperti prenotati ±intervalloSlot minuti (finestra ±intervallo)
    const occupati = confermateGiorno
      .filter(p => {
        const ph = p.dataOra.getHours()
        const pm = p.dataOra.getMinutes()
        const pMin = ph * 60 + pm
        return Math.abs(pMin - m) < intervalloSlot
      })
      .reduce((s, p) => s + p.numPersone, 0)

    const disponibili = maxCopertiPerSlot - occupati
    if (disponibili >= numPersone) {
      out.push({ ora, copertiDisponibili: disponibili, copertiOccupati: occupati })
    }
  }
  return out
}

// ─── Async DB-loading wrapper ──────────────────────────────────────────────

export async function calcolaSlotRistorante(opts: {
  strutturaId: string
  data: Date
  numPersone: number
}): Promise<RistoranteSlot[]> {
  const { prisma } = await import('@/lib/db')
  const { strutturaId, data, numPersone } = opts

  const config = await prisma.configRistorante.findUnique({
    where: { strutturaId },
  })
  if (!config) return []

  const dataInizio = new Date(data)
  dataInizio.setHours(0, 0, 0, 0)
  const dataFine = new Date(dataInizio)
  dataFine.setDate(dataFine.getDate() + 1)

  const prenotazioni = await prisma.prenotazioneRistorante.findMany({
    where: { strutturaId, dataOra: { gte: dataInizio, lt: dataFine } },
    select: { dataOra: true, numPersone: true, stato: true },
  })

  return calcolaSlotRistoranteFromData({
    oraApertura: config.oraApertura,
    oraChiusura: config.oraChiusura,
    intervalloSlot: config.intervalloSlot,
    maxCopertiPerSlot: config.maxCopertiPerSlot,
    giorniChiusura: config.giorniChiusura,
    dataGiorno: data,
    numPersone,
    prenotazioni,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
