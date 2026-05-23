import { differenceInCalendarDays, eachDayOfInterval, subDays } from 'date-fns'
import {
  calcolaTassaSoggiorno,
  type RegolaTassaSoggiornoInput,
  type EsenzioneTassaInput,
} from '@/lib/tassa-soggiorno'

/**
 * Calcolo prezzo dinamico per soggiorno.
 *
 * Priorita:
 *   1. TariffaPeriodo (manuale) — se un giorno cade in un periodo tariffa, usa quel prezzo
 *   2. RegolaTariffa per-notte (WEEKEND / STAGIONE / FESTIVO) — applicate in `calcolaPrezzo`
 *   3. RegolaTariffa stay-level (DURATA / EARLY_BIRD / LAST_MINUTE) — applicate in `calcolaPrezzoBreakdown`
 *   4. prezzoBase dell'unita — fallback
 *
 * Le regole per-notte di tipi diversi si sommano; dello stesso tipo vince la priorità più alta.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type TariffaPeriodo = {
  nome: string
  colore: string | null
  prezzo: number
  dataInizio: Date | string
  dataFine: Date | string
}

export type RegolaTariffa = {
  id: string
  nome: string
  tipo: 'WEEKEND' | 'STAGIONE' | 'FESTIVO' | 'DURATA' | 'EARLY_BIRD' | 'LAST_MINUTE'
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
  nottiMinime: number | null
  giorniMinimi: number | null
  giorniMassimi: number | null
}

export type PrezzoNotte = {
  data: string          // yyyy-MM-dd
  prezzoBase: number
  prezzoFinale: number
  tariffaPeriodo: { nome: string; colore: string | null } | null
  regoleApplicate: { nome: string; tipo: string; delta: number }[]
}

export type CalcoloPrezzoResult = {
  notti: number
  prezzoTotale: number
  prezzoMedioNotte: number
  dettaglioNotti: PrezzoNotte[]
  haRegoleDinamiche: boolean
}

export type PriceBreakdown = {
  notti: number
  prezzoBaseNotte: number
  subtotaleAlloggio: number
  regoleApplicate: { nome: string; tipo: string; importo: number }[]
  supplementi: { descrizione: string; importo: number }[]
  subtotaleSconti: number
  subtotaleSupplementi: number
  tassaSoggiorno: { importoNotte: number; persone: number; notti: number; totale: number }
  totale: number
  valuta: 'EUR'
  dettaglioNotti: PrezzoNotte[]
}

export type PrezzoBreakdownInput = {
  dataArrivo: Date
  dataPartenza: Date
  dataPrenotazione?: Date
  adulti: number
  bambini: number
  /** Età specifica dei bambini (per soglia età variabile per comune nella tassa). Se vuoto, contano tutti come "esenti" (vecchio comportamento) */
  etaBambini?: number[]
  lettoExtra: number
  prezzoBase: number
  prezzoLettoExtra: number | null
  unitaId: string
  tariffePeriodo: TariffaPeriodo[]
  regole: RegolaTariffa[]
  /** Importo fallback usato se nessuna regola tassa attiva (legacy `Struttura.tassaSoggiornoPerNotte`) */
  tassaSoggiornoPerNotte: number
  /** Nuove regole tassa stagionali con soglia età/cap notti. Se vuoto, usa fallback `tassaSoggiornoPerNotte` */
  regoleTassa?: RegolaTassaSoggiornoInput[]
  /** Esenzioni applicate alla prenotazione (disabili, forze ordine, ecc.) */
  esenzioniTassa?: EsenzioneTassaInput[]
}

// ─── Pure helpers ──────────────────────────────────────────────────────────

/** Gauss algorithm for Easter Sunday (Gregorian calendar). */
export function calcolaEtaPasqua(anno: number): Date {
  const a = anno % 19
  const b = Math.floor(anno / 100)
  const c = anno % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mese = Math.floor((h + l - 7 * m + 114) / 31)
  const giorno = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(anno, mese - 1, giorno)
}

const FESTIVI_FISSI: [number, number][] = [
  [1, 1],   // Capodanno
  [1, 6],   // Epifania
  [4, 25],  // Liberazione
  [5, 1],   // Festa del Lavoro
  [6, 2],   // Festa della Repubblica
  [8, 15],  // Ferragosto
  [11, 1],  // Ognissanti
  [12, 8],  // Immacolata Concezione
  [12, 25], // Natale
  [12, 26], // S. Stefano
]

/** Returns true if the date is an Italian national public holiday. */
export function eFestivoItaliano(giorno: Date): boolean {
  const mese = giorno.getMonth() + 1
  const gg = giorno.getDate()
  const anno = giorno.getFullYear()

  if (FESTIVI_FISSI.some(([m, g]) => m === mese && g === gg)) return true

  const pasqua = calcolaEtaPasqua(anno)
  if (pasqua.getMonth() + 1 === mese && pasqua.getDate() === gg) return true

  // Pasquetta = Pasqua + 1
  const pasquetta = new Date(pasqua)
  pasquetta.setDate(pasquetta.getDate() + 1)
  if (pasquetta.getMonth() + 1 === mese && pasquetta.getDate() === gg) return true

  return false
}

/**
 * Counts nights in [arrivo, partenza) that fall on Friday or Saturday
 * (convention: 0=Lun … 6=Dom).
 */
export function contaNottiWeekend(arrivo: Date, partenza: Date): number {
  const lastNight = subDays(partenza, 1)
  if (lastNight < arrivo) return 0
  return eachDayOfInterval({ start: arrivo, end: lastNight }).filter(d => {
    const jsDay = d.getDay()               // 0=Dom … 6=Sab
    const g = jsDay === 0 ? 6 : jsDay - 1  // 0=Lun … 6=Dom
    return g === 4 || g === 5              // Venerdì o Sabato
  }).length
}

/** Counts nights in [arrivo, partenza) that are Italian public holidays. */
export function contaGiorniFestivi(arrivo: Date, partenza: Date): number {
  const lastNight = subDays(partenza, 1)
  if (lastNight < arrivo) return 0
  return eachDayOfInterval({ start: arrivo, end: lastNight }).filter(eFestivoItaliano).length
}

// ─── calcolaPrezzo (per-night breakdown — backward compat) ─────────────────

/**
 * Calcola il prezzo per ogni notte nel range [arrivo, partenza).
 * Gestisce WEEKEND, STAGIONE, FESTIVO per notte.
 * DURATA / EARLY_BIRD / LAST_MINUTE sono stay-level e gestiti da calcolaPrezzoBreakdown.
 */
export function calcolaPrezzo(opts: {
  arrivo: Date
  partenza: Date
  prezzoBase: number
  unitaId: string
  tariffePeriodo: TariffaPeriodo[]
  regole: RegolaTariffa[]
}): CalcoloPrezzoResult {
  const { arrivo, partenza, prezzoBase, unitaId, tariffePeriodo, regole } = opts

  const lastNight = subDays(partenza, 1)
  if (lastNight < arrivo) {
    return { notti: 0, prezzoTotale: 0, prezzoMedioNotte: 0, dettaglioNotti: [], haRegoleDinamiche: false }
  }

  const notti = eachDayOfInterval({ start: arrivo, end: lastNight })
  const regoleAttive = regole.filter(
    r => r.attiva && (r.unitaId === null || r.unitaId === unitaId)
  )
  let haRegoleDinamiche = false

  const dettaglioNotti: PrezzoNotte[] = notti.map(giorno => {
    const ymd = formatYMD(giorno)

    // 1. TariffaPeriodo sovrascrive tutto
    const tariffa = tariffePeriodo.find(t => {
      const ini = formatYMD(new Date(t.dataInizio))
      const fin = formatYMD(new Date(t.dataFine))
      return ymd >= ini && ymd <= fin
    })
    if (tariffa) {
      return {
        data: ymd,
        prezzoBase,
        prezzoFinale: tariffa.prezzo,
        tariffaPeriodo: { nome: tariffa.nome, colore: tariffa.colore },
        regoleApplicate: [],
      }
    }

    // 2. RegolaTariffa per-notte (WEEKEND / STAGIONE / FESTIVO only)
    let prezzoFinale = prezzoBase
    const regoleApplicate: { nome: string; tipo: string; delta: number }[] = []

    const perTipo = new Map<string, RegolaTariffa>()
    for (const r of regoleAttive) {
      if (!['WEEKEND', 'STAGIONE', 'FESTIVO'].includes(r.tipo)) continue
      if (!regolaApplicabile(r, giorno)) continue
      const existing = perTipo.get(r.tipo)
      if (!existing || r.priorita > existing.priorita) perTipo.set(r.tipo, r)
    }

    for (const r of perTipo.values()) {
      const delta = r.modificatore === 'PERCENTUALE'
        ? Math.round((prezzoBase * r.valore) / 100 * 100) / 100
        : r.valore
      prezzoFinale += delta
      regoleApplicate.push({ nome: r.nome, tipo: r.tipo, delta })
      haRegoleDinamiche = true
    }

    return {
      data: ymd,
      prezzoBase,
      prezzoFinale: Math.round(prezzoFinale * 100) / 100,
      tariffaPeriodo: null,
      regoleApplicate,
    }
  })

  const prezzoTotale = Math.round(dettaglioNotti.reduce((s, n) => s + n.prezzoFinale, 0) * 100) / 100
  const prezzoMedioNotte = notti.length > 0 ? Math.round((prezzoTotale / notti.length) * 100) / 100 : 0

  return { notti: notti.length, prezzoTotale, prezzoMedioNotte, dettaglioNotti, haRegoleDinamiche }
}

// ─── calcolaPrezzoBreakdown (stay-level, pure) ─────────────────────────────

/**
 * Calcola il breakdown completo del prezzo per un soggiorno.
 * Chiama calcolaPrezzo per le notti, poi applica regole stay-level,
 * supplementi e tassa di soggiorno.
 */
export function calcolaPrezzoBreakdown(input: PrezzoBreakdownInput): PriceBreakdown {
  const {
    dataArrivo, dataPartenza, adulti, lettoExtra,
    prezzoBase, prezzoLettoExtra, unitaId,
    tariffePeriodo, regole, tassaSoggiornoPerNotte,
  } = input
  const oggi = input.dataPrenotazione ?? new Date()

  // 1. Night-by-night base (WEEKEND / STAGIONE / FESTIVO)
  const baseResult = calcolaPrezzo({
    arrivo: dataArrivo,
    partenza: dataPartenza,
    prezzoBase,
    unitaId,
    tariffePeriodo,
    regole,
  })

  const notti = baseResult.notti
  const subtotaleAlloggio = baseResult.prezzoTotale

  // 2. Stay-level rules: DURATA, EARLY_BIRD, LAST_MINUTE
  const giorniAnticipo = differenceInCalendarDays(dataArrivo, oggi)
  const regoleApplicate: { nome: string; tipo: string; importo: number }[] = []

  const stayRules = regole.filter(
    r => r.attiva && (r.unitaId === null || r.unitaId === unitaId)
  )

  for (const r of stayRules) {
    let sconto = 0

    if (r.tipo === 'DURATA' && r.nottiMinime != null && notti >= r.nottiMinime) {
      sconto = r.modificatore === 'PERCENTUALE'
        ? -(subtotaleAlloggio * r.valore / 100)
        : -(r.valore * notti)
    } else if (r.tipo === 'EARLY_BIRD' && r.giorniMinimi != null && giorniAnticipo >= r.giorniMinimi) {
      sconto = r.modificatore === 'PERCENTUALE'
        ? -(subtotaleAlloggio * r.valore / 100)
        : -(r.valore * notti)
    } else if (r.tipo === 'LAST_MINUTE' && r.giorniMassimi != null && giorniAnticipo >= 0 && giorniAnticipo <= r.giorniMassimi) {
      sconto = r.modificatore === 'PERCENTUALE'
        ? -(subtotaleAlloggio * r.valore / 100)
        : -(r.valore * notti)
    }

    if (sconto !== 0) {
      regoleApplicate.push({ nome: r.nome, tipo: r.tipo, importo: Math.round(sconto * 100) / 100 })
    }
  }

  // 3. Supplementi
  const supplementi: { descrizione: string; importo: number }[] = []
  if (lettoExtra > 0 && prezzoLettoExtra != null && prezzoLettoExtra > 0) {
    const importo = Math.round(prezzoLettoExtra * lettoExtra * notti * 100) / 100
    supplementi.push({ descrizione: `Letto extra ×${lettoExtra} ×${notti} notti`, importo })
  }

  // 4. Tassa soggiorno
  //    - Se passi `regoleTassa` (nuovo): usa engine completo (stagionalità, età minima, cap notti, esenzioni)
  //    - Altrimenti fallback al vecchio comportamento (importo × adulti × notti, bambini esenti)
  const tassaResult = calcolaTassaSoggiorno({
    dataArrivo: input.dataArrivo,
    dataPartenza: input.dataPartenza,
    adulti,
    etaBambini: input.etaBambini ?? [],
    regole: input.regoleTassa ?? [],
    esenzioni: input.esenzioniTassa ?? [],
    fallbackImportoNotte: tassaSoggiornoPerNotte,
  })
  const totaleTassa = tassaResult.totale
  // Per backward compat manteniamo la shape `tassaSoggiorno` originale (importoNotte, persone, notti, totale).
  // `persone` rappresenta ora le persone applicabili medie. Per breakdown completo per-notte vedi `tassaSoggiornoDettaglio`.
  const personeMediaApplicabili = tassaResult.dettaglioNotti.length > 0
    ? Math.round(tassaResult.dettaglioNotti.reduce((s, n) => s + n.personeAddebitate, 0) / tassaResult.dettaglioNotti.length)
    : 0
  const importoNotteMedio = tassaResult.nottiAddebitate > 0
    ? Math.round((totaleTassa / tassaResult.nottiAddebitate) * 100) / 100
    : tassaSoggiornoPerNotte
  const tassaSoggiorno = { importoNotte: importoNotteMedio, persone: personeMediaApplicabili, notti: tassaResult.nottiAddebitate, totale: totaleTassa }

  const subtotaleSconti = Math.round(
    regoleApplicate.filter(r => r.importo < 0).reduce((s, r) => s + r.importo, 0) * 100
  ) / 100
  const subtotaleSupplementi = Math.round(
    supplementi.reduce((s, r) => s + r.importo, 0) * 100
  ) / 100

  const totale = Math.round(
    (subtotaleAlloggio + subtotaleSconti + subtotaleSupplementi + totaleTassa) * 100
  ) / 100

  return {
    notti,
    prezzoBaseNotte: prezzoBase,
    subtotaleAlloggio,
    regoleApplicate,
    supplementi,
    subtotaleSconti,
    subtotaleSupplementi,
    tassaSoggiorno,
    totale,
    valuta: 'EUR',
    dettaglioNotti: baseResult.dettaglioNotti,
  }
}

// ─── calcolaPrezzoPrenotazione (async, DB-loading) ─────────────────────────

export async function calcolaPrezzoPrenotazione(opts: {
  unitaId: string
  strutturaId: string
  dataArrivo: Date
  dataPartenza: Date
  adulti: number
  bambini: number
  /** Età specifica dei bambini (per soglia tassa soggiorno per comune) */
  etaBambini?: number[]
  lettoExtra: number
  dataPrenotazione?: Date
  /** Se passato, carica anche le esenzioni tassa di questa prenotazione */
  prenotazioneId?: string
}): Promise<PriceBreakdown> {
  const { prisma } = await import('@/lib/db')

  const [unita, regole, struttura, regoleTassa, esenzioniTassa] = await Promise.all([
    prisma.unitaPrenotabile.findUniqueOrThrow({
      where: { id: opts.unitaId },
      include: { tariffe: true },
    }),
    prisma.regolaTariffa.findMany({
      where: { strutturaId: opts.strutturaId, attiva: true },
    }),
    prisma.struttura.findUniqueOrThrow({
      where: { id: opts.strutturaId },
      select: { tassaSoggiornoPerNotte: true },
    }),
    prisma.regolaTassaSoggiorno.findMany({
      where: { strutturaId: opts.strutturaId, attiva: true },
      orderBy: { ordine: 'asc' },
    }),
    opts.prenotazioneId
      ? prisma.esenzioneTassaSoggiorno.findMany({ where: { prenotazioneId: opts.prenotazioneId } })
      : Promise.resolve([]),
  ])

  return calcolaPrezzoBreakdown({
    dataArrivo: opts.dataArrivo,
    dataPartenza: opts.dataPartenza,
    dataPrenotazione: opts.dataPrenotazione,
    adulti: opts.adulti,
    bambini: opts.bambini,
    etaBambini: opts.etaBambini ?? [],
    lettoExtra: opts.lettoExtra,
    prezzoBase: unita.prezzoBase,
    prezzoLettoExtra: unita.prezzoLettoExtra ?? null,
    unitaId: opts.unitaId,
    tariffePeriodo: unita.tariffe,
    regole,
    tassaSoggiornoPerNotte: struttura.tassaSoggiornoPerNotte ?? 0,
    regoleTassa: regoleTassa.map(r => ({
      id: r.id,
      importoNotte: r.importoNotte,
      dataInizio: r.dataInizio,
      dataFine: r.dataFine,
      ricorrenteAnnuale: r.ricorrenteAnnuale,
      etaMinimaApplicazione: r.etaMinimaApplicazione,
      maxNottiConsecutive: r.maxNottiConsecutive,
      attiva: r.attiva,
      ordine: r.ordine,
    })),
    esenzioniTassa: esenzioniTassa.map(e => ({
      tipoEsenzione: e.tipoEsenzione,
      numeroPersone: e.numeroPersone,
    })),
  })
}

// ─── Private helpers ───────────────────────────────────────────────────────

function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function regolaApplicabile(r: RegolaTariffa, giorno: Date): boolean {
  switch (r.tipo) {
    case 'WEEKEND': {
      const jsDay = giorno.getDay()
      const g = jsDay === 0 ? 6 : jsDay - 1
      return r.giorniSettimana.includes(g)
    }
    case 'STAGIONE': {
      if (r.meseInizio == null || r.meseFine == null) return false
      const mese = giorno.getMonth() + 1
      const gg = giorno.getDate()
      const ini = r.meseInizio * 100 + (r.giornoInizio ?? 1)
      const fin = r.meseFine * 100 + (r.giornoFine ?? 31)
      const current = mese * 100 + gg
      return ini <= fin ? current >= ini && current <= fin : current >= ini || current <= fin
    }
    case 'FESTIVO':
      return eFestivoItaliano(giorno)
    default:
      return false
  }
}
