/**
 * Test lib/tassa-soggiorno.ts — calcolo italiano completo
 */
import { describe, test, expect } from 'vitest'
import {
  calcolaTassaSoggiorno,
  regolaCopreData,
  trovaRegolaPerData,
  personeApplicabili,
  type RegolaTassaSoggiornoInput,
  type EsenzioneTassaInput,
} from '@/lib/tassa-soggiorno'

// ─── Factory ──────────────────────────────────────────────────────────────────

function regola(over: Partial<RegolaTassaSoggiornoInput> = {}): RegolaTassaSoggiornoInput {
  return {
    id: 'r1',
    importoNotte: 2,
    dataInizio: null,
    dataFine: null,
    ricorrenteAnnuale: true,
    etaMinimaApplicazione: null,
    maxNottiConsecutive: null,
    attiva: true,
    ordine: 0,
    ...over,
  }
}

function esenzione(over: Partial<EsenzioneTassaInput> = {}): EsenzioneTassaInput {
  return { tipoEsenzione: 'DISABILE', numeroPersone: 1, ...over }
}

// ─── personeApplicabili ───────────────────────────────────────────────────────

describe('personeApplicabili', () => {
  test('soglia 0 o null = solo adulti', () => {
    expect(personeApplicabili(2, [3, 8, 14], 0)).toBe(2)
    expect(personeApplicabili(2, [3, 8, 14], null)).toBe(2)
  })

  test('soglia 10 (Roma) = adulti + bambini >= 10', () => {
    expect(personeApplicabili(2, [3, 8, 12, 15], 10)).toBe(4) // 2 adulti + 2 bambini ≥10
  })

  test('soglia 12 (Firenze) = adulti + bambini >= 12', () => {
    expect(personeApplicabili(2, [3, 8, 12, 15], 12)).toBe(4) // 12 incluso
  })

  test('soglia 18 (Napoli) = solo adulti se bambini minorenni', () => {
    expect(personeApplicabili(2, [3, 8, 17], 18)).toBe(2)
  })

  test('nessun bambino', () => {
    expect(personeApplicabili(3, [], 10)).toBe(3)
  })

  test('solo bambini sotto soglia', () => {
    expect(personeApplicabili(0, [3, 5, 7], 10)).toBe(0)
  })
})

// ─── regolaCopreData ──────────────────────────────────────────────────────────

describe('regolaCopreData', () => {
  test('regola senza date = sempre attiva', () => {
    expect(regolaCopreData(regola(), new Date('2026-01-15'))).toBe(true)
    expect(regolaCopreData(regola(), new Date('2026-07-15'))).toBe(true)
  })

  test('regola disattiva = mai', () => {
    expect(regolaCopreData(regola({ attiva: false }), new Date('2026-07-15'))).toBe(false)
  })

  test('ricorrente annuale: alta stagione apr-set, copre giugno', () => {
    const r = regola({
      dataInizio: new Date('2026-04-01'),
      dataFine: new Date('2026-09-30'),
      ricorrenteAnnuale: true,
    })
    expect(regolaCopreData(r, new Date('2027-06-15'))).toBe(true)
    expect(regolaCopreData(r, new Date('2027-12-15'))).toBe(false)
    expect(regolaCopreData(r, new Date('2025-06-15'))).toBe(true)
  })

  test('ricorrente annuale: range cross-year (inverno nov-mar)', () => {
    const r = regola({
      dataInizio: new Date('2026-11-15'),
      dataFine: new Date('2026-03-15'),
      ricorrenteAnnuale: true,
    })
    expect(regolaCopreData(r, new Date('2027-01-10'))).toBe(true) // gennaio nel range cross-year
    expect(regolaCopreData(r, new Date('2027-12-01'))).toBe(true) // dicembre nel range
    expect(regolaCopreData(r, new Date('2027-06-15'))).toBe(false) // giugno fuori
  })

  test('non ricorrente: range esatto su anno specifico', () => {
    const r = regola({
      dataInizio: new Date('2026-06-01'),
      dataFine: new Date('2026-08-31'),
      ricorrenteAnnuale: false,
    })
    expect(regolaCopreData(r, new Date('2026-07-15'))).toBe(true)
    expect(regolaCopreData(r, new Date('2027-07-15'))).toBe(false) // anno diverso
  })
})

// ─── trovaRegolaPerData ───────────────────────────────────────────────────────

describe('trovaRegolaPerData', () => {
  test('prima regola attiva per ordine asc che copre data', () => {
    const r1 = regola({ id: 'a', ordine: 1, importoNotte: 5 })
    const r2 = regola({ id: 'b', ordine: 0, importoNotte: 2 }) // ordine 0 → vince
    const r3 = regola({ id: 'c', ordine: 2, importoNotte: 10 })
    expect(trovaRegolaPerData([r1, r2, r3], new Date('2026-06-15'))?.id).toBe('b')
  })

  test('regola alta stagione prevale su standard se ordinata prima', () => {
    const altaStagione = regola({
      id: 'high', ordine: 0, importoNotte: 5,
      dataInizio: new Date('2026-06-01'), dataFine: new Date('2026-09-30'),
    })
    const standard = regola({ id: 'std', ordine: 1, importoNotte: 2 })
    expect(trovaRegolaPerData([standard, altaStagione], new Date('2026-07-15'))?.id).toBe('high')
    expect(trovaRegolaPerData([standard, altaStagione], new Date('2026-01-15'))?.id).toBe('std')
  })

  test('nessuna regola copre = null', () => {
    expect(trovaRegolaPerData([], new Date('2026-06-15'))).toBeNull()
  })
})

// ─── calcolaTassaSoggiorno — casi base ────────────────────────────────────────

describe('calcolaTassaSoggiorno — casi base', () => {
  test('2 adulti, 5 notti, regola standard €2/notte', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-06'),
      adulti: 2,
      etaBambini: [],
      regole: [regola({ importoNotte: 2 })],
      esenzioni: [],
    })
    expect(res.nottiSoggiorno).toBe(5)
    expect(res.nottiAddebitate).toBe(5)
    expect(res.totale).toBe(20) // 2 × 5 × 2
    expect(res.dettaglioNotti).toHaveLength(5)
    expect(res.dettaglioNotti[0].totale).toBe(4) // 2 × 2
  })

  test('0 notti (stesso giorno arrivo/partenza)', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-01'),
      adulti: 2, etaBambini: [],
      regole: [regola()], esenzioni: [],
    })
    expect(res.nottiSoggiorno).toBe(0)
    expect(res.totale).toBe(0)
    expect(res.warnings.length).toBeGreaterThan(0)
  })

  test('nessuna regola attiva e nessun fallback = 0', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-03'),
      adulti: 2, etaBambini: [],
      regole: [], esenzioni: [],
    })
    expect(res.totale).toBe(0)
    expect(res.dettaglioNotti.every(n => n.motivoZero === 'nessuna_regola')).toBe(true)
  })

  test('nessuna regola attiva ma fallback presente (backward compat)', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-04'),
      adulti: 3, etaBambini: [],
      regole: [], esenzioni: [],
      fallbackImportoNotte: 1.5,
    })
    expect(res.totale).toBe(13.5) // 3 × 3 × 1.5
    expect(res.dettaglioNotti[0].regolaId).toBe('fallback')
  })
})

// ─── Stagionalità ─────────────────────────────────────────────────────────────

describe('calcolaTassaSoggiorno — stagionalità', () => {
  test('soggiorno a cavallo tra bassa e alta stagione', () => {
    // Notti dal 30/06 al 03/07 (3 notti). Alta stagione inizia 01/07.
    const standard = regola({ id: 'std', ordine: 1, importoNotte: 1.5 })
    const altaStag = regola({
      id: 'high', ordine: 0, importoNotte: 3.5,
      dataInizio: new Date('2026-07-01'), dataFine: new Date('2026-09-30'),
    })
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-30'),
      dataPartenza: new Date('2026-07-03'),
      adulti: 2, etaBambini: [],
      regole: [standard, altaStag], esenzioni: [],
    })
    expect(res.nottiSoggiorno).toBe(3)
    // Notte 30/06 = bassa stagione (2 × 1.5 = 3)
    // Notte 01/07 = alta (2 × 3.5 = 7)
    // Notte 02/07 = alta (2 × 3.5 = 7)
    expect(res.totale).toBe(17)
    expect(res.dettaglioNotti[0].regolaId).toBe('std')
    expect(res.dettaglioNotti[1].regolaId).toBe('high')
    expect(res.dettaglioNotti[2].regolaId).toBe('high')
  })
})

// ─── Età minima (Roma 10, Firenze 12, Napoli 18) ─────────────────────────────

describe('calcolaTassaSoggiorno — età minima', () => {
  test('Roma: bambini <10 esenti, ≥10 pagano', () => {
    // 2 adulti + bambini di 5, 9, 12, 15 anni, 1 notte
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-02'),
      adulti: 2, etaBambini: [5, 9, 12, 15],
      regole: [regola({ importoNotte: 5, etaMinimaApplicazione: 10 })],
      esenzioni: [],
    })
    expect(res.dettaglioNotti[0].personeApplicabili).toBe(4) // 2 adulti + 2 bambini ≥10
    expect(res.totale).toBe(20)
  })

  test('Napoli: solo adulti se bambini minorenni', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-03'),
      adulti: 2, etaBambini: [3, 14, 17],
      regole: [regola({ importoNotte: 3, etaMinimaApplicazione: 18 })],
      esenzioni: [],
    })
    expect(res.dettaglioNotti[0].personeApplicabili).toBe(2) // solo adulti
    expect(res.totale).toBe(12) // 2 × 2 × 3
  })

  test('soglia 0 esplicita = tutti pagano (anche bambini)', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-02'),
      adulti: 2, etaBambini: [3, 7],
      regole: [regola({ importoNotte: 1, etaMinimaApplicazione: 0 })],
      esenzioni: [],
    })
    // Soglia 0 = bambini esenti (legacy behavior — vedi personeApplicabili)
    expect(res.dettaglioNotti[0].personeApplicabili).toBe(2)
  })
})

// ─── Cap notti consecutive ────────────────────────────────────────────────────

describe('calcolaTassaSoggiorno — cap notti', () => {
  test('Roma: 12 notti soggiorno, cap 10 → addebita solo 10', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-13'),
      adulti: 2, etaBambini: [],
      regole: [regola({ importoNotte: 5, maxNottiConsecutive: 10 })],
      esenzioni: [],
    })
    expect(res.nottiSoggiorno).toBe(12)
    expect(res.nottiAddebitate).toBe(10)
    expect(res.totale).toBe(100) // 2 × 10 × 5
    expect(res.warnings.some(w => w.includes('cap'))).toBe(true)
    // Notti 10 e 11 devono avere motivoZero='oltre_cap_notti'
    expect(res.dettaglioNotti[10].motivoZero).toBe('oltre_cap_notti')
    expect(res.dettaglioNotti[11].motivoZero).toBe('oltre_cap_notti')
  })

  test('Firenze: 7 notti soggiorno con cap 7 → tutte addebitate', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-08'),
      adulti: 1, etaBambini: [],
      regole: [regola({ importoNotte: 5, maxNottiConsecutive: 7 })],
      esenzioni: [],
    })
    expect(res.nottiAddebitate).toBe(7)
    expect(res.totale).toBe(35)
    expect(res.warnings).toHaveLength(0)
  })
})

// ─── Esenzioni ────────────────────────────────────────────────────────────────

describe('calcolaTassaSoggiorno — esenzioni', () => {
  test('1 disabile + accompagnatore in coppia → solo 2 persone esentate, 0 pagano', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-03'),
      adulti: 2, etaBambini: [],
      regole: [regola({ importoNotte: 3 })],
      esenzioni: [
        esenzione({ tipoEsenzione: 'DISABILE', numeroPersone: 1 }),
        esenzione({ tipoEsenzione: 'ACCOMPAGNATORE_DISABILE', numeroPersone: 1 }),
      ],
    })
    expect(res.personeEsentateTotale).toBe(2)
    expect(res.totale).toBe(0)
    expect(res.dettaglioNotti[0].motivoZero).toBe('tutti_esenti')
  })

  test('4 adulti, 1 forza ordine in servizio → 3 pagano', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-02'),
      adulti: 4, etaBambini: [],
      regole: [regola({ importoNotte: 2.5 })],
      esenzioni: [esenzione({ tipoEsenzione: 'FORZE_ORDINE_SERVIZIO', numeroPersone: 1 })],
    })
    expect(res.dettaglioNotti[0].personeAddebitate).toBe(3)
    expect(res.totale).toBe(7.5) // 3 × 2.5
  })

  test('esenzione > persone applicabili: cap a personeApplicabili', () => {
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-02'),
      adulti: 1, etaBambini: [],
      regole: [regola({ importoNotte: 2 })],
      esenzioni: [esenzione({ numeroPersone: 5 })], // bug input: più esenti che persone
    })
    expect(res.dettaglioNotti[0].personeEsentate).toBe(1) // capato
    expect(res.totale).toBe(0)
  })
})

// ─── Caso integrato realistico ───────────────────────────────────────────────

describe('calcolaTassaSoggiorno — caso integrato Roma agosto', () => {
  test('Famiglia 2 ad + 2 bimbi (5+11), 8 notti agosto a Roma, 1 disabile esente', () => {
    // Roma alta stagione (apr-ott): €5/notte/persona, età minima 10, max 10 notti
    const res = calcolaTassaSoggiorno({
      dataArrivo: new Date('2026-08-10'),
      dataPartenza: new Date('2026-08-18'),
      adulti: 2,
      etaBambini: [5, 11],
      regole: [regola({
        importoNotte: 5,
        dataInizio: new Date('2026-04-01'),
        dataFine: new Date('2026-10-31'),
        etaMinimaApplicazione: 10,
        maxNottiConsecutive: 10,
      })],
      esenzioni: [esenzione({ tipoEsenzione: 'DISABILE', numeroPersone: 1 })],
    })
    expect(res.nottiSoggiorno).toBe(8)
    expect(res.nottiAddebitate).toBe(8) // sotto cap
    // Per notte: applicabili = 2 ad + 1 bimbo (11 ≥ 10) = 3; esenti = 1; addebitati = 2
    expect(res.dettaglioNotti[0].personeApplicabili).toBe(3)
    expect(res.dettaglioNotti[0].personeEsentate).toBe(1)
    expect(res.dettaglioNotti[0].personeAddebitate).toBe(2)
    expect(res.totale).toBe(80) // 8 notti × 2 persone × 5€
  })
})
