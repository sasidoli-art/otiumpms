import { eachDayOfInterval, subDays } from 'date-fns'

/**
 * Calcolo prezzo dinamico per soggiorno.
 *
 * Priorita:
 *   1. TariffaPeriodo (manuale) — se un giorno cade in un periodo tariffa, usa quel prezzo
 *   2. RegolaTariffa (automatica) — se nessuna tariffa periodo, applica regole (weekend/stagione/festivo)
 *   3. prezzoBase dell'unita — fallback
 *
 * Le regole si sommano: se weekend +20% E stagione +€30, entrambe si applicano.
 * Se piu regole dello stesso tipo si sovrappongono, vince quella con priorita piu alta.
 */

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
  tipo: 'WEEKEND' | 'STAGIONE' | 'FESTIVO'
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

/**
 * Calcola il prezzo per ogni notte nel range [arrivo, partenza).
 * La notte di partenza non si conta (checkout).
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

  // Generate each night (arrivo inclusive, partenza exclusive)
  const lastNight = subDays(partenza, 1)
  if (lastNight < arrivo) {
    return { notti: 0, prezzoTotale: 0, prezzoMedioNotte: 0, dettaglioNotti: [], haRegoleDinamiche: false }
  }

  const notti = eachDayOfInterval({ start: arrivo, end: lastNight })
  const regoleAttive = regole.filter(r => r.attiva && (r.unitaId === null || r.unitaId === unitaId))
  let haRegoleDinamiche = false

  const dettaglioNotti: PrezzoNotte[] = notti.map(giorno => {
    const ymd = formatYMD(giorno)

    // 1. Check TariffaPeriodo
    const tariffa = tariffePeriodo.find(t => {
      const ini = formatYMD(new Date(t.dataInizio))
      const fin = formatYMD(new Date(t.dataFine))
      return ymd >= ini && ymd <= fin
    })

    if (tariffa) {
      // Tariffa periodo sovrascrive tutto
      return {
        data: ymd,
        prezzoBase,
        prezzoFinale: tariffa.prezzo,
        tariffaPeriodo: { nome: tariffa.nome, colore: tariffa.colore },
        regoleApplicate: [],
      }
    }

    // 2. Apply RegolaTariffa
    let prezzoFinale = prezzoBase
    const regoleApplicate: { nome: string; tipo: string; delta: number }[] = []

    // Group rules by type and pick highest priority per type
    const perTipo = new Map<string, RegolaTariffa>()
    for (const r of regoleAttive) {
      if (!regolaApplicabile(r, giorno)) continue
      const existing = perTipo.get(r.tipo)
      if (!existing || r.priorita > existing.priorita) {
        perTipo.set(r.tipo, r)
      }
    }

    // Apply all winning rules (one per type, they stack)
    for (const r of perTipo.values()) {
      let delta: number
      if (r.modificatore === 'PERCENTUALE') {
        delta = Math.round((prezzoBase * r.valore) / 100 * 100) / 100
      } else {
        delta = r.valore
      }
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

  return {
    notti: notti.length,
    prezzoTotale,
    prezzoMedioNotte,
    dettaglioNotti,
    haRegoleDinamiche,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Check if a rule applies to a specific day */
function regolaApplicabile(r: RegolaTariffa, giorno: Date): boolean {
  switch (r.tipo) {
    case 'WEEKEND': {
      // giorniSettimana: 0=Lun, 6=Dom (our convention)
      const giornoJs = giorno.getDay() // 0=Dom
      const g = giornoJs === 0 ? 6 : giornoJs - 1 // 0=Lun..6=Dom
      return r.giorniSettimana.includes(g)
    }
    case 'STAGIONE': {
      if (r.meseInizio == null || r.meseFine == null) return false
      const mese = giorno.getMonth() + 1 // 1-12
      const gg = giorno.getDate()
      const ini = r.meseInizio * 100 + (r.giornoInizio ?? 1)
      const fin = r.meseFine * 100 + (r.giornoFine ?? 31)
      const current = mese * 100 + gg

      // Handle wrap-around (e.g., Nov-Feb)
      if (ini <= fin) {
        return current >= ini && current <= fin
      } else {
        return current >= ini || current <= fin
      }
    }
    case 'FESTIVO': {
      // Festivo uses giorniSettimana as empty, applies to all days in season range
      // or could be extended to specific dates — for now treat like STAGIONE
      if (r.meseInizio == null || r.meseFine == null) return false
      const mese = giorno.getMonth() + 1
      const gg = giorno.getDate()
      const ini = r.meseInizio * 100 + (r.giornoInizio ?? 1)
      const fin = r.meseFine * 100 + (r.giornoFine ?? 31)
      const current = mese * 100 + gg
      if (ini <= fin) {
        return current >= ini && current <= fin
      } else {
        return current >= ini || current <= fin
      }
    }
    default:
      return false
  }
}
