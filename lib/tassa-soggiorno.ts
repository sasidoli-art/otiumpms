/**
 * Tassa di Soggiorno — calcolo italiano completo
 *
 * Sostituisce il calcolo semplificato in lib/pricing.ts che faceva solo:
 *   tassaSoggiornoPerNotte × adulti × notti
 *
 * Gestisce la realtà normativa italiana:
 *  - Stagionalità (regole con dataInizio/dataFine + ricorrenza annuale)
 *  - Soglia età variabile per comune (Roma 10, Firenze 12, Venezia 10, Napoli 18)
 *  - Tetto max notti consecutive (Roma 10, Firenze 7, Bologna 5)
 *  - Esenzioni speciali (disabili, accompagnatori, forze ordine, autisti, pellegrini, ecc.)
 *
 * Funzione PURA: accetta tutto come parametri, non legge da DB. Testabile
 * con vitest senza mock Prisma. Integrazione DB-loading in lib/pricing.ts.
 */

// ─── Tipi ────────────────────────────────────────────────────────────────────

export interface RegolaTassaSoggiornoInput {
  id: string
  importoNotte: number
  // Stagionalità — null = sempre attiva
  dataInizio: Date | null
  dataFine: Date | null
  ricorrenteAnnuale: boolean
  // Esenzione per età (bambini sotto questa soglia non pagano). null/0 = tutti pagano.
  etaMinimaApplicazione: number | null
  // Tetto max notti oltre cui non addebita. null = nessun cap.
  maxNottiConsecutive: number | null
  attiva: boolean
  ordine: number
}

export type TipoEsenzioneTassaInput =
  | 'DISABILE'
  | 'ACCOMPAGNATORE_DISABILE'
  | 'FORZE_ORDINE_SERVIZIO'
  | 'AUTISTA_GRUPPO'
  | 'PAZIENTE_MEDICO'
  | 'MINORE'
  | 'PELLEGRINO'
  | 'ALTRO'

export interface EsenzioneTassaInput {
  tipoEsenzione: TipoEsenzioneTassaInput
  numeroPersone: number
}

export interface CalcolaTassaInput {
  dataArrivo: Date
  dataPartenza: Date
  adulti: number
  etaBambini: number[] // es. [3, 7, 12]
  regole: RegolaTassaSoggiornoInput[]
  esenzioni: EsenzioneTassaInput[]
  /** Fallback se nessuna regola attiva: importo singolo per persona per notte (legacy `Struttura.tassaSoggiornoPerNotte`) */
  fallbackImportoNotte?: number
}

export interface NotteBreakdown {
  data: string // YYYY-MM-DD
  regolaId: string | null // 'fallback' se usata fallback, null se nessuna applicata
  importoNotte: number
  personeApplicabili: number // dopo età minima
  personeEsentate: number
  personeAddebitate: number // applicabili - esentate
  totale: number // personeAddebitate * importoNotte
  motivoZero?: string // 'oltre_cap_notti' | 'nessuna_regola' | 'tutti_esenti' | 'tutti_sotto_eta_minima'
}

export interface TassaBreakdown {
  /** Totale tassa per tutta la prenotazione (€) */
  totale: number
  /** Numero notti soggiorno */
  nottiSoggiorno: number
  /** Numero notti effettivamente addebitate (dopo cap) */
  nottiAddebitate: number
  /** Numero persone totale (adulti + bambini) */
  numeroPersone: number
  /** Persone esentate complessivamente (somma esenzioni) */
  personeEsentateTotale: number
  /** Dettaglio per notte */
  dettaglioNotti: NotteBreakdown[]
  /** Eventuali warning (es. "regola applicata ha cap 7, soggiorno è 10 notti, 3 non addebitate") */
  warnings: string[]
}

// ─── Helpers puri ─────────────────────────────────────────────────────────────

function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function diffNotti(arrivo: Date, partenza: Date): number {
  const ms = partenza.getTime() - arrivo.getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Verifica se una data ricade nel range della regola.
 * Se ricorrenteAnnuale=true, confronta solo MM-DD (regola riusabile ogni anno).
 */
export function regolaCopreData(regola: RegolaTassaSoggiornoInput, data: Date): boolean {
  if (!regola.attiva) return false
  if (!regola.dataInizio && !regola.dataFine) return true // sempre attiva

  if (regola.ricorrenteAnnuale && (regola.dataInizio || regola.dataFine)) {
    const md = (d: Date) => d.getMonth() * 100 + d.getDate()
    const target = md(data)
    const start = regola.dataInizio ? md(regola.dataInizio) : -Infinity
    const end = regola.dataFine ? md(regola.dataFine) : Infinity
    // Range cross-year: es. 11-15 → 03-15 (inverno)
    if (start > end) return target >= start || target <= end
    return target >= start && target <= end
  }

  // Range esatto su anno specifico
  const t = data.getTime()
  const start = regola.dataInizio?.getTime() ?? -Infinity
  const end = regola.dataFine?.getTime() ?? Infinity
  return t >= start && t <= end
}

/**
 * Per una data, trova la prima regola attiva che la copre (ordine asc).
 * Restituisce null se nessuna applicabile.
 */
export function trovaRegolaPerData(
  regole: RegolaTassaSoggiornoInput[],
  data: Date,
): RegolaTassaSoggiornoInput | null {
  const sorted = [...regole].sort((a, b) => a.ordine - b.ordine)
  return sorted.find(r => regolaCopreData(r, data)) ?? null
}

/**
 * Conta quante persone (adulti + bambini) hanno età >= sogliaMinima.
 * Adulti sempre conteggiati. Bambini solo se età >= soglia.
 * Se soglia è 0/null → tutti i bambini sono esenti (legacy behavior).
 */
export function personeApplicabili(
  adulti: number,
  etaBambini: number[],
  etaMinima: number | null,
): number {
  const soglia = etaMinima ?? 0
  if (soglia === 0) return adulti // bambini esenti (default storico)
  const bambiniPaganti = etaBambini.filter(eta => eta >= soglia).length
  return adulti + bambiniPaganti
}

// ─── Main calculator ─────────────────────────────────────────────────────────

export function calcolaTassaSoggiorno(input: CalcolaTassaInput): TassaBreakdown {
  const {
    dataArrivo, dataPartenza, adulti, etaBambini = [],
    regole, esenzioni, fallbackImportoNotte = 0,
  } = input

  const nottiSoggiorno = diffNotti(dataArrivo, dataPartenza)
  const numeroPersone = adulti + etaBambini.length
  const personeEsentateTotale = esenzioni.reduce((s, e) => s + e.numeroPersone, 0)
  const warnings: string[] = []
  const dettaglioNotti: NotteBreakdown[] = []

  if (nottiSoggiorno <= 0) {
    return {
      totale: 0, nottiSoggiorno: 0, nottiAddebitate: 0,
      numeroPersone, personeEsentateTotale,
      dettaglioNotti: [], warnings: ['Nessuna notte da addebitare (soggiorno 0 notti)'],
    }
  }

  // Trova la regola che si applica al primo giorno per usarne il cap notti
  const regolaPrincipale = trovaRegolaPerData(regole.filter(r => r.attiva), dataArrivo)
  const capNotti = regolaPrincipale?.maxNottiConsecutive ?? null
  const nottiAddebitate = capNotti != null && nottiSoggiorno > capNotti
    ? capNotti
    : nottiSoggiorno

  if (capNotti != null && nottiSoggiorno > capNotti) {
    warnings.push(`Soggiorno di ${nottiSoggiorno} notti supera cap di ${capNotti} notti — addebitata tassa solo per le prime ${capNotti}`)
  }

  let totale = 0

  for (let i = 0; i < nottiSoggiorno; i++) {
    const dataNotte = addDays(dataArrivo, i)
    const ymd = formatYMD(dataNotte)

    // Notte oltre cap → addebito 0 ma tracciato per trasparenza
    if (i >= nottiAddebitate) {
      dettaglioNotti.push({
        data: ymd, regolaId: null, importoNotte: 0,
        personeApplicabili: 0, personeEsentate: 0, personeAddebitate: 0,
        totale: 0, motivoZero: 'oltre_cap_notti',
      })
      continue
    }

    // Trova regola per questa specifica data (stagionalità)
    const regola = trovaRegolaPerData(regole.filter(r => r.attiva), dataNotte)

    // Niente regola e niente fallback → 0
    if (!regola && !fallbackImportoNotte) {
      dettaglioNotti.push({
        data: ymd, regolaId: null, importoNotte: 0,
        personeApplicabili: 0, personeEsentate: 0, personeAddebitate: 0,
        totale: 0, motivoZero: 'nessuna_regola',
      })
      continue
    }

    const importoNotte = regola?.importoNotte ?? fallbackImportoNotte
    const regolaId = regola?.id ?? 'fallback'
    const etaMin = regola?.etaMinimaApplicazione ?? null

    const applicabili = personeApplicabili(adulti, etaBambini, etaMin)
    const esentate = Math.min(personeEsentateTotale, applicabili)
    const addebitate = Math.max(0, applicabili - esentate)
    const nottaTotale = round2(importoNotte * addebitate)

    dettaglioNotti.push({
      data: ymd,
      regolaId,
      importoNotte,
      personeApplicabili: applicabili,
      personeEsentate: esentate,
      personeAddebitate: addebitate,
      totale: nottaTotale,
      motivoZero: addebitate === 0
        ? (applicabili === 0 ? 'tutti_sotto_eta_minima' : 'tutti_esenti')
        : undefined,
    })

    totale += nottaTotale
  }

  return {
    totale: round2(totale),
    nottiSoggiorno,
    nottiAddebitate,
    numeroPersone,
    personeEsentateTotale,
    dettaglioNotti,
    warnings,
  }
}
