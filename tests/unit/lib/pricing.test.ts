/**
 * Test lib/pricing.ts — calcolo dinamico prezzo per soggiorno.
 *
 * Nota sul comportamento reale (divergenze dalla spec user):
 *  - Regole di tipi DIVERSI si SOMMANO (es. weekend + stagione si applicano entrambe)
 *  - Regole dello STESSO tipo: vince la priorità più alta (non cumulative)
 *  - `RegolaTariffa.tipo: 'DURATA'` è dichiarato nell'enum ma NON implementato in
 *    `regolaApplicabile` (torna sempre false) — test skippati con flag
 *  - Tassa di soggiorno NON è calcolata in `pricing.ts` — vive altrove
 *  - prezzoBase è `number` (non nullable) — il caller deve garantire
 */

import { describe, test, expect } from 'vitest'
import { calcolaPrezzo } from '@/lib/pricing'
import { createTestRegolaTariffa, createTestTariffaPeriodo } from '../../fixtures/test-data'

describe('pricing — calcoloPrezzo', () => {
  test('calcola prezzo base per notte singola', () => {
    const res = calcolaPrezzo({
      arrivo: new Date('2026-05-01'),
      partenza: new Date('2026-05-02'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole: [],
    })
    expect(res.notti).toBe(1)
    expect(res.prezzoTotale).toBe(80)
    expect(res.prezzoMedioNotte).toBe(80)
    expect(res.haRegoleDinamiche).toBe(false)
  })

  test('calcola 3 notti con prezzo base', () => {
    const res = calcolaPrezzo({
      arrivo: new Date('2026-05-01'),
      partenza: new Date('2026-05-04'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole: [],
    })
    expect(res.notti).toBe(3)
    expect(res.prezzoTotale).toBe(240)
    expect(res.dettaglioNotti).toHaveLength(3)
  })

  test('TariffaPeriodo sovrascrive prezzo base', () => {
    // Alta stagione luglio-agosto a €120/notte
    const tariffa = createTestTariffaPeriodo({
      dataInizio: new Date('2026-07-01'),
      dataFine: new Date('2026-08-31'),
      prezzo: 120,
    })
    const res = calcolaPrezzo({
      arrivo: new Date('2026-07-10'),
      partenza: new Date('2026-07-13'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [tariffa],
      regole: [],
    })
    expect(res.notti).toBe(3)
    expect(res.prezzoTotale).toBe(360) // 120 × 3
    expect(res.dettaglioNotti.every((n) => n.tariffaPeriodo?.nome === 'Alta stagione')).toBe(true)
  })

  test('applica regola WEEKEND (+20%) su notti ven-sab', () => {
    // Regola: weekend = +20% (giorniSettimana: ven=4, sab=5 con convenzione 0=Lun)
    const regolaWeekend = createTestRegolaTariffa({
      id: 'r-wknd',
      nome: 'Weekend +20%',
      tipo: 'WEEKEND',
      modificatore: 'PERCENTUALE',
      valore: 20,
      giorniSettimana: [4, 5], // ven=4, sab=5 (convenzione 0=Lun del lib)
    })
    // 2026-05-01 è venerdì, 2026-05-02 è sabato, 2026-05-03 domenica (non weekend per la regola)
    const res = calcolaPrezzo({
      arrivo: new Date('2026-05-01'),
      partenza: new Date('2026-05-04'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole: [regolaWeekend],
    })
    // ven 80×1.2 = 96, sab 80×1.2 = 96, dom 80 = 80 → 272
    expect(res.prezzoTotale).toBe(272)
    expect(res.haRegoleDinamiche).toBe(true)
  })

  test('applica regola STAGIONE (+€30 fisso) in finestra stagionale', () => {
    const regolaStagione = createTestRegolaTariffa({
      id: 'r-stag',
      nome: 'Alta stagione',
      tipo: 'STAGIONE',
      modificatore: 'FISSO',
      valore: 30,
      meseInizio: 7, giornoInizio: 1,
      meseFine: 8, giornoFine: 31,
      giorniSettimana: [],
    })
    const res = calcolaPrezzo({
      arrivo: new Date('2026-07-15'),
      partenza: new Date('2026-07-17'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole: [regolaStagione],
    })
    expect(res.prezzoTotale).toBe(220) // (80+30) × 2
  })

  test('regole di tipi diversi si SOMMANO (weekend + stagione)', () => {
    // Weekend +20% + Stagione +€30 si applicano ENTRAMBE lo stesso giorno
    const regole = [
      createTestRegolaTariffa({
        id: 'r-wknd', tipo: 'WEEKEND', modificatore: 'PERCENTUALE', valore: 20,
        giorniSettimana: [4, 5],
      }),
      createTestRegolaTariffa({
        id: 'r-stag', tipo: 'STAGIONE', modificatore: 'FISSO', valore: 30,
        meseInizio: 7, giornoInizio: 1, meseFine: 8, giornoFine: 31,
        giorniSettimana: [],
      }),
    ]
    // 2026-07-17 è venerdì (luglio = stagione alta)
    const res = calcolaPrezzo({
      arrivo: new Date('2026-07-17'),
      partenza: new Date('2026-07-18'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole,
    })
    // 80 (base) + 16 (weekend +20%) + 30 (stagione) = 126
    expect(res.prezzoTotale).toBe(126)
    expect(res.dettaglioNotti[0].regoleApplicate).toHaveLength(2)
  })

  test('regole STESSO TIPO: vince priorità più alta (non si cumulano)', () => {
    // Due regole weekend: una +10%, una +25%. Vince quella a priorità più alta.
    const regole = [
      createTestRegolaTariffa({
        id: 'r-wknd-low', tipo: 'WEEKEND', modificatore: 'PERCENTUALE',
        valore: 10, priorita: 5, giorniSettimana: [4, 5],
      }),
      createTestRegolaTariffa({
        id: 'r-wknd-hi', tipo: 'WEEKEND', modificatore: 'PERCENTUALE',
        valore: 25, priorita: 20, giorniSettimana: [4, 5],
      }),
    ]
    const res = calcolaPrezzo({
      arrivo: new Date('2026-05-01'), // venerdì
      partenza: new Date('2026-05-02'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole,
    })
    expect(res.prezzoTotale).toBe(100) // 80 × 1.25 (NON 1.10 + 1.25)
  })

  test('regola filtrata per unita: applica solo all unita corrispondente', () => {
    const regola = createTestRegolaTariffa({
      id: 'r-per-unita', tipo: 'WEEKEND', modificatore: 'PERCENTUALE',
      valore: 50, unitaId: 'u-altra', giorniSettimana: [4],
    })
    const res = calcolaPrezzo({
      arrivo: new Date('2026-05-01'), // venerdì
      partenza: new Date('2026-05-02'),
      prezzoBase: 80,
      unitaId: 'u1', // ≠ u-altra
      tariffePeriodo: [],
      regole: [regola],
    })
    expect(res.prezzoTotale).toBe(80)
    expect(res.haRegoleDinamiche).toBe(false)
  })

  test('regola disattivata non si applica', () => {
    const regola = createTestRegolaTariffa({
      attiva: false, tipo: 'WEEKEND', modificatore: 'PERCENTUALE',
      valore: 50, giorniSettimana: [4],
    })
    const res = calcolaPrezzo({
      arrivo: new Date('2026-05-01'),
      partenza: new Date('2026-05-02'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole: [regola],
    })
    expect(res.prezzoTotale).toBe(80)
  })

  test('ritorna zero notti se partenza = arrivo', () => {
    const res = calcolaPrezzo({
      arrivo: new Date('2026-05-01'),
      partenza: new Date('2026-05-01'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole: [],
    })
    expect(res.notti).toBe(0)
    expect(res.prezzoTotale).toBe(0)
    expect(res.dettaglioNotti).toHaveLength(0)
  })

  test('gestisce prezzoBase 0 senza crash', () => {
    const res = calcolaPrezzo({
      arrivo: new Date('2026-05-01'),
      partenza: new Date('2026-05-02'),
      prezzoBase: 0,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole: [],
    })
    expect(res.prezzoTotale).toBe(0)
    expect(res.prezzoMedioNotte).toBe(0)
  })

  test('STAGIONE con wrap-around (es. Nov-Feb) riconosce entrambi i lati', () => {
    const regola = createTestRegolaTariffa({
      tipo: 'STAGIONE', modificatore: 'FISSO', valore: 50,
      meseInizio: 11, giornoInizio: 1,
      meseFine: 2, giornoFine: 28,
      giorniSettimana: [],
    })
    // Test giorno a gennaio (parte del wrap)
    const resJan = calcolaPrezzo({
      arrivo: new Date('2026-01-15'),
      partenza: new Date('2026-01-16'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole: [regola],
    })
    expect(resJan.prezzoTotale).toBe(130) // 80 + 50

    // Test giorno a maggio (fuori dal wrap)
    const resMay = calcolaPrezzo({
      arrivo: new Date('2026-05-15'),
      partenza: new Date('2026-05-16'),
      prezzoBase: 80,
      unitaId: 'u1',
      tariffePeriodo: [],
      regole: [regola],
    })
    expect(resMay.prezzoTotale).toBe(80)
  })

})

// ─── calcolaEtaPasqua ───────────────────────────────────────────────────────
import { calcolaEtaPasqua, eFestivoItaliano, contaNottiWeekend, contaGiorniFestivi, calcolaPrezzoBreakdown } from '@/lib/pricing'
import type { PrezzoBreakdownInput } from '@/lib/pricing'

describe('calcolaEtaPasqua', () => {
  test('2026 → domenica 5 aprile', () => {
    const p = calcolaEtaPasqua(2026)
    expect(p.getFullYear()).toBe(2026)
    expect(p.getMonth() + 1).toBe(4) // aprile
    expect(p.getDate()).toBe(5)
  })

  test('2024 → domenica 31 marzo', () => {
    const p = calcolaEtaPasqua(2024)
    expect(p.getFullYear()).toBe(2024)
    expect(p.getMonth() + 1).toBe(3) // marzo
    expect(p.getDate()).toBe(31)
  })

  test('2025 → domenica 20 aprile', () => {
    const p = calcolaEtaPasqua(2025)
    expect(p.getFullYear()).toBe(2025)
    expect(p.getMonth() + 1).toBe(4)
    expect(p.getDate()).toBe(20)
  })
})

// ─── eFestivoItaliano ───────────────────────────────────────────────────────
describe('eFestivoItaliano', () => {
  test('25 dicembre = Natale → festivo', () => {
    expect(eFestivoItaliano(new Date(2026, 11, 25))).toBe(true)
  })
  test('1 gennaio = Capodanno → festivo', () => {
    expect(eFestivoItaliano(new Date(2026, 0, 1))).toBe(true)
  })
  test('Pasqua 2026 (5 aprile) → festivo', () => {
    expect(eFestivoItaliano(new Date(2026, 3, 5))).toBe(true)
  })
  test('Pasquetta 2026 (6 aprile) → festivo', () => {
    expect(eFestivoItaliano(new Date(2026, 3, 6))).toBe(true)
  })
  test('15 agosto = Ferragosto → festivo', () => {
    expect(eFestivoItaliano(new Date(2026, 7, 15))).toBe(true)
  })
  test('10 giugno = giorno feriale → non festivo', () => {
    expect(eFestivoItaliano(new Date(2026, 5, 10))).toBe(false)
  })
})

// ─── contaNottiWeekend ──────────────────────────────────────────────────────
describe('contaNottiWeekend', () => {
  // 2026-05-01 venerdì, 05-02 sabato, 05-03 domenica
  test('ven-dom 3 notti = 2 notti weekend (ven+sab)', () => {
    expect(contaNottiWeekend(new Date('2026-05-01'), new Date('2026-05-04'))).toBe(2)
  })
  test('lun-mer 2 notti = 0 notti weekend', () => {
    // 2026-05-04 lunedì, 2026-05-06 mercoledì
    expect(contaNottiWeekend(new Date('2026-05-04'), new Date('2026-05-06'))).toBe(0)
  })
  test('arrivo = partenza → 0', () => {
    expect(contaNottiWeekend(new Date('2026-05-01'), new Date('2026-05-01'))).toBe(0)
  })
})

// ─── contaGiorniFestivi ─────────────────────────────────────────────────────
describe('contaGiorniFestivi', () => {
  test('soggiorno 25-26-27 dicembre = 2 festivi (Natale + S.Stefano)', () => {
    // notti: 25, 26 (27 è partenza, esclusa)
    expect(contaGiorniFestivi(new Date('2026-12-25'), new Date('2026-12-27'))).toBe(2)
  })
  test('soggiorno ferragosto 14-17 agosto = 1 festivo (15 ago)', () => {
    // notti: 14, 15, 16
    expect(contaGiorniFestivi(new Date('2026-08-14'), new Date('2026-08-17'))).toBe(1)
  })
  test('soggiorno senza festivi → 0', () => {
    // 10-13 giugno: nessun festivo
    expect(contaGiorniFestivi(new Date('2026-06-10'), new Date('2026-06-13'))).toBe(0)
  })
})

// ─── calcolaPrezzoBreakdown ─────────────────────────────────────────────────
describe('calcolaPrezzoBreakdown', () => {
  const base: PrezzoBreakdownInput = {
    dataArrivo: new Date('2026-06-01'),
    dataPartenza: new Date('2026-06-04'),
    adulti: 2,
    bambini: 0,
    lettoExtra: 0,
    prezzoBase: 80,
    prezzoLettoExtra: null,
    unitaId: 'u1',
    tariffePeriodo: [],
    regole: [],
    tassaSoggiornoPerNotte: 0,
  }

  test('senza regole né tassa: totale = subtotaleAlloggio = 80×3=240', () => {
    const r = calcolaPrezzoBreakdown(base)
    expect(r.notti).toBe(3)
    expect(r.subtotaleAlloggio).toBe(240)
    expect(r.totale).toBe(240)
    expect(r.regoleApplicate).toHaveLength(0)
    expect(r.supplementi).toHaveLength(0)
    expect(r.valuta).toBe('EUR')
  })

  test('DURATA 3+ notti -10% → sconto -24', () => {
    const r = calcolaPrezzoBreakdown({
      ...base,
      regole: [{
        id: 'r-dur', nome: 'Lunga durata -10%', tipo: 'DURATA', attiva: true,
        priorita: 10, modificatore: 'PERCENTUALE', valore: 10,
        unitaId: null, nottiMinime: 3, giorniMinimi: null, giorniMassimi: null,
        meseInizio: null, giornoInizio: null, meseFine: null, giornoFine: null,
        giorniSettimana: [],
      }],
    })
    expect(r.regoleApplicate).toHaveLength(1)
    expect(r.regoleApplicate[0].importo).toBe(-24)
    expect(r.subtotaleSconti).toBe(-24)
    expect(r.totale).toBe(216)
  })

  test('DURATA non raggiunta (2 notti, min 3) → nessuno sconto', () => {
    const r = calcolaPrezzoBreakdown({
      ...base,
      dataArrivo: new Date('2026-06-01'),
      dataPartenza: new Date('2026-06-03'), // 2 notti
      regole: [{
        id: 'r-dur', nome: 'Lunga durata -10%', tipo: 'DURATA', attiva: true,
        priorita: 10, modificatore: 'PERCENTUALE', valore: 10,
        unitaId: null, nottiMinime: 3, giorniMinimi: null, giorniMassimi: null,
        meseInizio: null, giornoInizio: null, meseFine: null, giornoFine: null,
        giorniSettimana: [],
      }],
    })
    expect(r.regoleApplicate).toHaveLength(0)
  })

  test('EARLY_BIRD 30+ giorni anticipo -15% → sconto applicato', () => {
    // dataPrenotazione = 60 giorni prima dell'arrivo
    const arrivo = new Date('2026-09-01')
    const prenotazione = new Date('2026-07-01') // 62 giorni prima
    const r = calcolaPrezzoBreakdown({
      ...base,
      dataArrivo: arrivo,
      dataPartenza: new Date('2026-09-04'), // 3 notti × 80 = 240
      dataPrenotazione: prenotazione,
      regole: [{
        id: 'r-eb', nome: 'Early Bird -15%', tipo: 'EARLY_BIRD', attiva: true,
        priorita: 10, modificatore: 'PERCENTUALE', valore: 15,
        unitaId: null, nottiMinime: null, giorniMinimi: 30, giorniMassimi: null,
        meseInizio: null, giornoInizio: null, meseFine: null, giornoFine: null,
        giorniSettimana: [],
      }],
    })
    expect(r.regoleApplicate).toHaveLength(1)
    expect(r.regoleApplicate[0].tipo).toBe('EARLY_BIRD')
    expect(r.subtotaleSconti).toBe(-36) // 15% di 240
    expect(r.totale).toBe(204)
  })

  test('LAST_MINUTE 3 giorni o meno → sconto -10%', () => {
    const arrivo = new Date('2026-06-03')
    const prenotazione = new Date('2026-06-01') // 2 giorni prima
    const r = calcolaPrezzoBreakdown({
      ...base,
      dataArrivo: arrivo,
      dataPartenza: new Date('2026-06-06'), // 3 notti × 80 = 240
      dataPrenotazione: prenotazione,
      regole: [{
        id: 'r-lm', nome: 'Last Minute -10%', tipo: 'LAST_MINUTE', attiva: true,
        priorita: 10, modificatore: 'PERCENTUALE', valore: 10,
        unitaId: null, nottiMinime: null, giorniMinimi: null, giorniMassimi: 3,
        meseInizio: null, giornoInizio: null, meseFine: null, giornoFine: null,
        giorniSettimana: [],
      }],
    })
    expect(r.regoleApplicate).toHaveLength(1)
    expect(r.regoleApplicate[0].tipo).toBe('LAST_MINUTE')
    expect(r.subtotaleSconti).toBe(-24)
  })

  test('letto extra €15/notte × 1 letto × 3 notti = supplemento €45', () => {
    const r = calcolaPrezzoBreakdown({ ...base, lettoExtra: 1, prezzoLettoExtra: 15 })
    expect(r.supplementi).toHaveLength(1)
    expect(r.supplementi[0].importo).toBe(45)
    expect(r.subtotaleSupplementi).toBe(45)
    expect(r.totale).toBe(285)
  })

  test('tassa soggiorno €2/persona × 2 adulti × 3 notti = €12', () => {
    const r = calcolaPrezzoBreakdown({ ...base, tassaSoggiornoPerNotte: 2 })
    expect(r.tassaSoggiorno.totale).toBe(12)
    expect(r.tassaSoggiorno.persone).toBe(2)
    expect(r.tassaSoggiorno.notti).toBe(3)
    expect(r.totale).toBe(252)
  })

  test('bambini non contano per tassa soggiorno (adulti = 2, bambini = 2)', () => {
    const r = calcolaPrezzoBreakdown({ ...base, adulti: 2, bambini: 2, tassaSoggiornoPerNotte: 2 })
    expect(r.tassaSoggiorno.persone).toBe(2) // solo adulti
    expect(r.tassaSoggiorno.totale).toBe(12)
  })

  test('FESTIVO applicato via calcolaPrezzo: notte di Natale +€20', () => {
    // 25 dicembre è festivo → regola FESTIVO applicata nella per-notte breakdown
    const r = calcolaPrezzoBreakdown({
      ...base,
      dataArrivo: new Date('2026-12-25'),
      dataPartenza: new Date('2026-12-26'), // 1 notte
      regole: [{
        id: 'r-fest', nome: 'Festivo +€20', tipo: 'FESTIVO', attiva: true,
        priorita: 10, modificatore: 'FISSO', valore: 20,
        unitaId: null, nottiMinime: null, giorniMinimi: null, giorniMassimi: null,
        meseInizio: null, giornoInizio: null, meseFine: null, giornoFine: null,
        giorniSettimana: [],
      }],
    })
    expect(r.subtotaleAlloggio).toBe(100) // 80 + 20 festivo
    expect(r.totale).toBe(100)
  })
})
