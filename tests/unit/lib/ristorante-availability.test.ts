import { describe, test, expect } from 'vitest'
import { calcolaSlotRistoranteFromData } from '@/lib/ristorante-availability'
import type { CalcolaSlotRistoranteInput } from '@/lib/ristorante-availability'

const LUNEDI = new Date(2026, 4, 4)  // 2026-05-04 lunedì
const MERCOLEDI = new Date(2026, 4, 6) // 2026-05-06 mercoledì

const baseInput: CalcolaSlotRistoranteInput = {
  oraApertura: '12:00',
  oraChiusura: '14:00',
  intervalloSlot: 30,
  maxCopertiPerSlot: 20,
  giorniChiusura: [],
  dataGiorno: LUNEDI,
  numPersone: 1,
  prenotazioni: [],
}

describe('calcolaSlotRistoranteFromData', () => {
  test('senza prenotazioni → tutti gli slot disponibili (12:00, 12:30, 13:00, 13:30)', () => {
    const slots = calcolaSlotRistoranteFromData(baseInput)
    expect(slots.map(s => s.ora)).toEqual(['12:00', '12:30', '13:00', '13:30'])
    expect(slots.every(s => s.copertiDisponibili === 20)).toBe(true)
  })

  test('giorno di chiusura → array vuoto', () => {
    // lunedì = 0 in convenzione lib
    const slots = calcolaSlotRistoranteFromData({ ...baseInput, giorniChiusura: [0] })
    expect(slots).toHaveLength(0)
  })

  test('prenotazione 4 persone alle 12:30 → slot 12:30 ha 16 disponibili', () => {
    const pren = { dataOra: new Date(2026, 4, 4, 12, 30), numPersone: 4, stato: 'CONFERMATA' }
    const slots = calcolaSlotRistoranteFromData({ ...baseInput, prenotazioni: [pren] })
    const slot1230 = slots.find(s => s.ora === '12:30')
    expect(slot1230?.copertiDisponibili).toBe(16)
    expect(slot1230?.copertiOccupati).toBe(4)
    // Slot 12:00 è esattamente 30 min di distanza (non < 30 → non conta)
    const slot1200 = slots.find(s => s.ora === '12:00')
    expect(slot1200?.copertiOccupati).toBe(0)
  })

  test('prenotazioni ANNULLATA non contano', () => {
    const pren = { dataOra: new Date(2026, 4, 4, 12, 30), numPersone: 20, stato: 'ANNULLATA' }
    const slots = calcolaSlotRistoranteFromData({ ...baseInput, prenotazioni: [pren] })
    expect(slots.every(s => s.copertiOccupati === 0)).toBe(true)
  })

  test('slot pieno (occupati >= max) non compare nei risultati', () => {
    // 20 persone prenotate per 12:00 → slot 12:00 pieno, non mostrato
    const pren = { dataOra: new Date(2026, 4, 4, 12, 0), numPersone: 20, stato: 'CONFERMATA' }
    const slots = calcolaSlotRistoranteFromData({ ...baseInput, prenotazioni: [pren], numPersone: 1 })
    expect(slots.find(s => s.ora === '12:00')).toBeUndefined()
  })

  test('slot con disponibili < numPersone richieste non compare', () => {
    // 18 occupati, ne voglio 3 → slot non mostrato
    const pren = { dataOra: new Date(2026, 4, 4, 12, 30), numPersone: 18, stato: 'CONFERMATA' }
    const slots = calcolaSlotRistoranteFromData({ ...baseInput, numPersone: 3, prenotazioni: [pren] })
    expect(slots.find(s => s.ora === '12:30')).toBeUndefined()
  })

  test('prenotazione di giorno diverso non influenza il risultato', () => {
    const altroGiorno = new Date(2026, 4, 5, 12, 30) // martedì
    const pren = { dataOra: altroGiorno, numPersone: 20, stato: 'CONFERMATA' }
    const slots = calcolaSlotRistoranteFromData({ ...baseInput, prenotazioni: [pren] })
    expect(slots.every(s => s.copertiOccupati === 0)).toBe(true)
  })

  test('orario apertura = chiusura → nessuno slot', () => {
    const slots = calcolaSlotRistoranteFromData({ ...baseInput, oraApertura: '12:00', oraChiusura: '12:00' })
    expect(slots).toHaveLength(0)
  })
})
