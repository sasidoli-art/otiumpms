/**
 * Test unitari per lib/availability.ts — copre solo le funzioni pure di date
 * (startOfDay, addDays, sameDay, formatYMD, enumGiorni). La funzione principale
 * `calcolaDisponibilita` richiede Prisma con seed e va testata in
 * tests/integration. Qui validiamo le primitive che decidono la "presenza
 * di un giorno nel range" — bug subtle che generano overbooking.
 */
import { describe, test, expect } from 'vitest'
import {
  startOfDay,
  addDays,
  sameDay,
  formatYMD,
  enumGiorni,
} from '@/lib/availability'

describe('availability — startOfDay', () => {
  test('azzera ora/min/sec/ms preservando giorno locale', () => {
    const d = new Date(2026, 5, 15, 14, 32, 45, 999) // 15 giu 2026 14:32:45.999 locale
    const r = startOfDay(d)
    expect(r.getFullYear()).toBe(2026)
    expect(r.getMonth()).toBe(5)
    expect(r.getDate()).toBe(15)
    expect(r.getHours()).toBe(0)
    expect(r.getMinutes()).toBe(0)
    expect(r.getSeconds()).toBe(0)
    expect(r.getMilliseconds()).toBe(0)
  })

  test('non muta l input', () => {
    const d = new Date(2026, 5, 15, 14, 32)
    startOfDay(d)
    expect(d.getHours()).toBe(14) // ancora 14
  })
})

describe('availability — addDays', () => {
  test('+1 giorno passa al giorno successivo', () => {
    const r = addDays(new Date(2026, 5, 15), 1)
    expect(r.getDate()).toBe(16)
    expect(r.getMonth()).toBe(5)
  })

  test('attraversa cambio mese', () => {
    const r = addDays(new Date(2026, 5, 30), 1)
    expect(r.getDate()).toBe(1)
    expect(r.getMonth()).toBe(6) // luglio
  })

  test('attraversa cambio anno', () => {
    const r = addDays(new Date(2026, 11, 31), 1)
    expect(r.getDate()).toBe(1)
    expect(r.getMonth()).toBe(0)
    expect(r.getFullYear()).toBe(2027)
  })

  test('valore negativo retrocede', () => {
    const r = addDays(new Date(2026, 5, 15), -5)
    expect(r.getDate()).toBe(10)
    expect(r.getMonth()).toBe(5)
  })

  test('zero giorni = stesso giorno (azzerato)', () => {
    const r = addDays(new Date(2026, 5, 15, 14, 30), 0)
    expect(r.getDate()).toBe(15)
    expect(r.getHours()).toBe(0)
  })
})

describe('availability — sameDay', () => {
  test('stesso giorno con ore diverse', () => {
    const a = new Date(2026, 5, 15, 9, 0)
    const b = new Date(2026, 5, 15, 23, 59)
    expect(sameDay(a, b)).toBe(true)
  })

  test('giorni diversi (stesso mese)', () => {
    expect(sameDay(new Date(2026, 5, 15), new Date(2026, 5, 16))).toBe(false)
  })

  test('mesi diversi (stesso giorno)', () => {
    expect(sameDay(new Date(2026, 5, 15), new Date(2026, 6, 15))).toBe(false)
  })

  test('anni diversi', () => {
    expect(sameDay(new Date(2026, 5, 15), new Date(2025, 5, 15))).toBe(false)
  })
})

describe('availability — formatYMD', () => {
  test('formato YYYY-MM-DD', () => {
    expect(formatYMD(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  test('zero-pad mese e giorno', () => {
    expect(formatYMD(new Date(2026, 8, 9))).toBe('2026-09-09')
  })

  test('dicembre = 12, non 13', () => {
    expect(formatYMD(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('availability — enumGiorni', () => {
  test('range 3 giorni half-open', () => {
    const giorni = Array.from(enumGiorni(new Date(2026, 5, 15), new Date(2026, 5, 18)))
    expect(giorni).toHaveLength(3)
    expect(giorni[0].getDate()).toBe(15)
    expect(giorni[1].getDate()).toBe(16)
    expect(giorni[2].getDate()).toBe(17) // 18 ESCLUSO (giorno checkout)
  })

  test('range vuoto se start = end', () => {
    const giorni = Array.from(enumGiorni(new Date(2026, 5, 15), new Date(2026, 5, 15)))
    expect(giorni).toHaveLength(0)
  })

  test('range vuoto se end < start', () => {
    const giorni = Array.from(enumGiorni(new Date(2026, 5, 18), new Date(2026, 5, 15)))
    expect(giorni).toHaveLength(0)
  })

  test('1 notte = 1 giorno', () => {
    const giorni = Array.from(enumGiorni(new Date(2026, 5, 15), new Date(2026, 5, 16)))
    expect(giorni).toHaveLength(1)
    expect(giorni[0].getDate()).toBe(15)
  })

  test('attraversa cambio mese (half-open)', () => {
    // enumGiorni(29 giu, 2 lug) = 29 giu, 30 giu, 1 lug → 3 giorni (2 lug escluso)
    const giorni = Array.from(enumGiorni(new Date(2026, 5, 29), new Date(2026, 6, 2)))
    expect(giorni).toHaveLength(3)
    expect(giorni.map((g) => g.getDate())).toEqual([29, 30, 1])
    expect(giorni[2].getMonth()).toBe(6) // luglio
  })

  test('check-out subito dopo arrivo (1 notte) = 1 giorno', () => {
    const arrivo = new Date(2026, 5, 15)
    const partenza = addDays(arrivo, 1)
    const giorni = Array.from(enumGiorni(arrivo, partenza))
    expect(giorni).toHaveLength(1)
  })
})
