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

  // NON IMPLEMENTATO: tipo DURATA — l'enum esiste ma `regolaApplicabile`
  // ritorna false per questo case. Skippato con flag.
  test.skip('DURATA: sconto per soggiorno 3+ notti (non implementato nel codice)', () => {
    // Quando il team implementerà il case DURATA in regolaApplicabile(),
    // rimuovere lo skip e completare questo test.
  })

  // NON IMPLEMENTATO: pricing.ts non calcola la tassa di soggiorno.
  // La tassa vive su `Prenotazione.tassaSoggiorno` (calcolata nel booking flow).
  test.skip('tassa di soggiorno (non in lib/pricing.ts — vedi flusso booking)', () => {})
})
