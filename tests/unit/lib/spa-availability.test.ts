import { describe, test, expect } from 'vitest'
import {
  toMinutes,
  toHHMM,
  slotsOverlap,
  generaSlotGiornata,
  appuntamentiSovrapposti,
  fasciaCopreSlot,
} from '@/lib/spa-availability'

describe('spa-availability — toMinutes', () => {
  test('00:00 = 0', () => { expect(toMinutes('00:00')).toBe(0) })
  test('09:30 = 570', () => { expect(toMinutes('09:30')).toBe(570) })
  test('23:59 = 1439', () => { expect(toMinutes('23:59')).toBe(1439) })
  test('formato malformato → throw', () => {
    expect(() => toMinutes('9:30')).not.toThrow() // accetta 1 cifra ora
    expect(() => toMinutes('25:00')).toThrow()
    expect(() => toMinutes('09:60')).toThrow()
    expect(() => toMinutes('abc')).toThrow()
  })
})

describe('spa-availability — toHHMM', () => {
  test('0 = 00:00', () => { expect(toHHMM(0)).toBe('00:00') })
  test('570 = 09:30', () => { expect(toHHMM(570)).toBe('09:30') })
  test('1439 = 23:59', () => { expect(toHHMM(1439)).toBe('23:59') })
  test('zero-pad ora e minuti', () => { expect(toHHMM(305)).toBe('05:05') })
})

describe('spa-availability — slotsOverlap (half-open)', () => {
  test('intervalli identici sovrapposti', () => {
    expect(slotsOverlap(540, 600, 540, 600)).toBe(true)
  })
  test('A finisce esattamente all inizio di B → NO overlap (half-open)', () => {
    expect(slotsOverlap(540, 600, 600, 660)).toBe(false)
  })
  test('B finisce esattamente all inizio di A → NO overlap', () => {
    expect(slotsOverlap(600, 660, 540, 600)).toBe(false)
  })
  test('overlap parziale (A precede B)', () => {
    expect(slotsOverlap(540, 600, 580, 640)).toBe(true)
  })
  test('A contiene B', () => {
    expect(slotsOverlap(540, 700, 580, 640)).toBe(true)
  })
  test('B contiene A', () => {
    expect(slotsOverlap(580, 640, 540, 700)).toBe(true)
  })
  test('disgiunti', () => {
    expect(slotsOverlap(540, 600, 700, 760)).toBe(false)
  })
})

describe('spa-availability — generaSlotGiornata', () => {
  test('range stretto: 09:00-11:00 interval 30 durata 50', () => {
    const slots = generaSlotGiornata({ startHour: 9, endHour: 11, intervalMin: 30, durataMin: 50 })
    // Slots che terminano <= 11:00:
    //   09:00→09:50 OK
    //   09:30→10:20 OK
    //   10:00→10:50 OK
    //   10:30→11:20 NO (eccede)
    expect(slots.map((s) => s.oraInizio)).toEqual(['09:00', '09:30', '10:00'])
    expect(slots[2].oraFine).toBe('10:50')
  })

  test('range giornata standard 8-20 interval 30 durata 60', () => {
    const slots = generaSlotGiornata({ startHour: 8, endHour: 20, intervalMin: 30, durataMin: 60 })
    expect(slots[0].oraInizio).toBe('08:00')
    expect(slots[0].oraFine).toBe('09:00')
    // Ultimo slot che termina entro 20:00 → inizia alle 19:00
    expect(slots[slots.length - 1].oraInizio).toBe('19:00')
    expect(slots[slots.length - 1].oraFine).toBe('20:00')
  })

  test('durata > range → vuoto', () => {
    const slots = generaSlotGiornata({ startHour: 9, endHour: 10, intervalMin: 30, durataMin: 90 })
    expect(slots).toHaveLength(0)
  })

  test('endHour <= startHour → throw', () => {
    expect(() => generaSlotGiornata({ startHour: 10, endHour: 10, intervalMin: 30, durataMin: 30 })).toThrow()
    expect(() => generaSlotGiornata({ startHour: 12, endHour: 10, intervalMin: 30, durataMin: 30 })).toThrow()
  })

  test('interval/durata <= 0 → throw', () => {
    expect(() => generaSlotGiornata({ startHour: 9, endHour: 11, intervalMin: 0, durataMin: 30 })).toThrow()
    expect(() => generaSlotGiornata({ startHour: 9, endHour: 11, intervalMin: 30, durataMin: 0 })).toThrow()
  })

  test('inizioMin/fineMin coerenti con HHMM', () => {
    const [s] = generaSlotGiornata({ startHour: 9, endHour: 10, intervalMin: 30, durataMin: 30 })
    expect(s.inizioMin).toBe(540) // 9*60
    expect(s.fineMin).toBe(570)
  })
})

describe('spa-availability — appuntamentiSovrapposti', () => {
  const appuntamenti = [
    { inizioMin: 540, fineMin: 600, terapistaId: 't1', cabinaId: 'c1' }, // 09:00-10:00
    { inizioMin: 600, fineMin: 660, terapistaId: 't2', cabinaId: 'c2' }, // 10:00-11:00
    { inizioMin: 720, fineMin: 780, terapistaId: 't1', cabinaId: 'c2' }, // 12:00-13:00
  ]

  test('slot 09:30-10:30 → 2 sovrapposti (10:00-11:00 e 09:00-10:00)', () => {
    const ovs = appuntamentiSovrapposti(appuntamenti, 570, 630)
    expect(ovs).toHaveLength(2)
  })

  test('slot 11:00-12:00 → 0 sovrapposti (gap)', () => {
    const ovs = appuntamentiSovrapposti(appuntamenti, 660, 720)
    expect(ovs).toHaveLength(0)
  })

  test('slot 13:00-14:00 → 0 sovrapposti (dopo ultimo)', () => {
    const ovs = appuntamentiSovrapposti(appuntamenti, 780, 840)
    expect(ovs).toHaveLength(0)
  })
})

describe('spa-availability — fasciaCopreSlot', () => {
  test('fascia 09:00-13:00 copre slot 10:00-11:00', () => {
    expect(fasciaCopreSlot('09:00', '13:00', 600, 660)).toBe(true)
  })

  test('fascia inizia troppo tardi', () => {
    expect(fasciaCopreSlot('11:00', '13:00', 600, 660)).toBe(false)
  })

  test('fascia finisce troppo presto', () => {
    expect(fasciaCopreSlot('09:00', '10:30', 600, 660)).toBe(false)
  })

  test('fascia esattamente coincidente con slot', () => {
    expect(fasciaCopreSlot('10:00', '11:00', 600, 660)).toBe(true)
  })
})
