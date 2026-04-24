/**
 * Test lib/alloggiati.ts — generatore file Alloggiati Web PS.
 *
 * Formato reale (NON posizionale fixed-width come la spec user):
 *   TAB-delimited. Tipo 1 = testata, Tipo 2 = schedina alloggiato.
 *   Tipo alloggiato: 16=singolo, 19=capofamiglia (con acc.), 20=accompagnatore.
 *   (Nota: la spec user diceva "tipo 19 per accompagnatore" → errata, è 20).
 */

import { describe, test, expect } from 'vitest'
import {
  generateAlloggiatiFile, generaFileAlloggiati,
  validaPrenotazioneAlloggiati, validaAccompagnatoreAlloggiati,
} from '@/lib/alloggiati'
import { createTestPrenotazione, createTestStruttura } from '../../fixtures/test-data'

describe('alloggiati — validaPrenotazioneAlloggiati', () => {
  test('valido con tutti i campi obbligatori', () => {
    const p = createTestPrenotazione()
    const res = validaPrenotazioneAlloggiati(p)
    expect(res.valido).toBe(true)
    expect(res.campiMancanti).toEqual([])
  })

  test('segnala Sesso mancante', () => {
    const p = createTestPrenotazione({ guestSesso: null })
    const res = validaPrenotazioneAlloggiati(p)
    expect(res.valido).toBe(false)
    expect(res.campiMancanti).toContain('Sesso')
  })

  test('segnala Data di nascita mancante', () => {
    const p = createTestPrenotazione({ guestDataNascita: null })
    const res = validaPrenotazioneAlloggiati(p)
    expect(res.valido).toBe(false)
    expect(res.campiMancanti).toContain('Data di nascita')
  })

  test('segnala Luogo di nascita mancante se manca sia comune che stato', () => {
    const p = createTestPrenotazione({
      guestComuneNascitaIstat: null,
      guestStatoNascitaIstat: null,
    })
    const res = validaPrenotazioneAlloggiati(p)
    expect(res.valido).toBe(false)
    expect(res.campiMancanti).toContain('Luogo di nascita')
  })

  test('valido se comune mancante ma stato presente (ospite estero)', () => {
    const p = createTestPrenotazione({
      guestComuneNascitaIstat: null,
      guestStatoNascitaIstat: '100000230', // Francia ISTAT
    })
    const res = validaPrenotazioneAlloggiati(p)
    expect(res.valido).toBe(true)
  })

  test('segnala Cittadinanza, Tipo documento, Numero documento mancanti', () => {
    const p = createTestPrenotazione({
      guestCittadinanzaIstat: null,
      guestTipoDocumento: null,
      guestNumeroDocumento: null,
    })
    const res = validaPrenotazioneAlloggiati(p)
    expect(res.valido).toBe(false)
    expect(res.campiMancanti).toContain('Cittadinanza')
    expect(res.campiMancanti).toContain('Tipo documento')
    expect(res.campiMancanti).toContain('Numero documento')
  })

  test('segnala Cognome o Nome mancanti (whitespace-only counta come vuoto)', () => {
    const p = createTestPrenotazione({ guestCognome: '   ' })
    const res = validaPrenotazioneAlloggiati(p)
    expect(res.valido).toBe(false)
    expect(res.campiMancanti).toContain('Cognome')
  })
})

describe('alloggiati — validaAccompagnatoreAlloggiati', () => {
  const accBase = {
    nome: 'Laura',
    cognome: 'Bianchi',
    sesso: 'F',
    dataNascita: new Date('1990-03-20'),
    luogoNascita: 'Milano',
    provinciaNascita: 'MI',
    comuneNascitaIstat: 'F205',
    statoNascitaIstat: '100000100',
    cittadinanzaIstat: '100000100',
    tipoDocumento: 'IDENTE',
    numeroDocumento: 'CA98765YZ',
    comuneRilascioIstat: 'F205',
    provinciaRilascio: 'MI',
  }

  test('valido con tutti i campi', () => {
    const res = validaAccompagnatoreAlloggiati(accBase)
    expect(res.valido).toBe(true)
  })

  test('segnala campo mancante', () => {
    const res = validaAccompagnatoreAlloggiati({ ...accBase, dataNascita: null })
    expect(res.valido).toBe(false)
    expect(res.campiMancanti).toContain('Data di nascita')
  })
})

describe('alloggiati — generateAlloggiatiFile output format', () => {
  const codice = 'IT099001'

  test('inizia con testata tipo 1 (TAB-delimited)', () => {
    const file = generateAlloggiatiFile(codice, [])
    const lines = file.split('\r\n')
    const header = lines[0].split('\t')
    expect(header[0]).toBe('1')
    expect(header[1]).toBe(codice)
    expect(header[2]).toMatch(/^\d{2}\/\d{2}\/\d{4}$/) // gg/mm/aaaa
  })

  test('ospite singolo → tipo 16 (ultima colonna)', () => {
    const ospite = {
      dataArrivo: new Date('2026-05-01'),
      dataPartenza: new Date('2026-05-04'),
      guestNome: 'Mario', guestCognome: 'Rossi',
      guestSesso: 'M',
      guestDataNascita: new Date('1985-06-15'),
      guestComuneNascitaIstat: 'H501',
      guestProvinciaNascita: 'RM',
      guestStatoNascitaIstat: '100000100',
      guestCittadinanzaIstat: '100000100',
      guestTipoDocumento: 'IDENTE',
      guestNumeroDocumento: 'CA12345AB',
      guestComuneRilascioIstat: 'H501',
      guestProvinciaRilascio: 'RM',
    }
    const file = generateAlloggiatiFile(codice, [ospite])
    const lines = file.split('\r\n')
    expect(lines).toHaveLength(2) // testata + 1 ospite
    const cols = lines[1].split('\t')
    expect(cols[0]).toBe('2') // tipo record
    expect(cols[cols.length - 1]).toBe('16') // tipo alloggiato = singolo
  })

  test('ospite con accompagnatori → tipo 19 (capofamiglia) + tipo 20 (accomp.)', () => {
    const ospite = {
      dataArrivo: new Date('2026-05-01'),
      dataPartenza: new Date('2026-05-04'),
      guestNome: 'Mario', guestCognome: 'Rossi',
      guestSesso: 'M',
      guestDataNascita: new Date('1985-06-15'),
      guestComuneNascitaIstat: 'H501',
      guestProvinciaNascita: 'RM',
      guestStatoNascitaIstat: '100000100',
      guestCittadinanzaIstat: '100000100',
      guestTipoDocumento: 'IDENTE',
      guestNumeroDocumento: 'CA12345AB',
      guestComuneRilascioIstat: 'H501',
      guestProvinciaRilascio: 'RM',
      accompagnatori: [
        {
          nome: 'Laura', cognome: 'Bianchi',
          sesso: 'F', dataNascita: new Date('1990-03-20'),
          luogoNascita: 'Milano',
          provinciaNascita: 'MI',
          comuneNascitaIstat: 'F205',
          statoNascitaIstat: '100000100',
          cittadinanzaIstat: '100000100',
          tipoDocumento: 'IDENTE',
          numeroDocumento: 'CA98765YZ',
          comuneRilascioIstat: 'F205',
          provinciaRilascio: 'MI',
        },
      ],
    }
    const file = generateAlloggiatiFile(codice, [ospite])
    const lines = file.split('\r\n')
    expect(lines).toHaveLength(3) // testata + titolare + accomp.
    const titolare = lines[1].split('\t')
    const accomp = lines[2].split('\t')
    expect(titolare[titolare.length - 1]).toBe('19') // capofamiglia
    expect(accomp[accomp.length - 1]).toBe('20') // accompagnatore
  })

  test('ospite con sesso M → codice "1", F → codice "2"', () => {
    const base = {
      dataArrivo: new Date('2026-05-01'),
      dataPartenza: new Date('2026-05-02'),
      guestNome: 'X', guestCognome: 'Y',
      guestDataNascita: new Date('1990-01-01'),
      guestComuneNascitaIstat: 'H501',
      guestProvinciaNascita: 'RM',
      guestStatoNascitaIstat: '100000100',
      guestCittadinanzaIstat: '100000100',
      guestTipoDocumento: 'IDENTE',
      guestNumeroDocumento: 'X1',
      guestComuneRilascioIstat: 'H501',
      guestProvinciaRilascio: 'RM',
    }
    const fileM = generateAlloggiatiFile(codice, [{ ...base, guestSesso: 'M' }])
    const fileF = generateAlloggiatiFile(codice, [{ ...base, guestSesso: 'F' }])
    // Posizione 6 (0-indexed 5) = codice sesso
    expect(fileM.split('\r\n')[1].split('\t')[5]).toBe('1')
    expect(fileF.split('\r\n')[1].split('\t')[5]).toBe('2')
  })

  test('ospite straniero: codice comune="0" e provincia="EE"', () => {
    const ospiteEstero = {
      dataArrivo: new Date('2026-05-01'),
      dataPartenza: new Date('2026-05-02'),
      guestNome: 'John', guestCognome: 'Smith',
      guestSesso: 'M',
      guestDataNascita: new Date('1980-01-01'),
      guestComuneNascitaIstat: null,
      guestProvinciaNascita: null,
      guestStatoNascitaIstat: '100000840', // USA
      guestCittadinanzaIstat: '100000840',
      guestTipoDocumento: 'PPORT',
      guestNumeroDocumento: 'US123456',
      guestComuneRilascioIstat: null,
      guestProvinciaRilascio: null,
    }
    const file = generateAlloggiatiFile(codice, [ospiteEstero])
    const cols = file.split('\r\n')[1].split('\t')
    // Posizione 7 (1-indexed) = comune nascita, 8 = provincia
    // Per estero: "0" e "EE"
    expect(cols[7]).toBe('0') // comune nascita
    expect(cols[8]).toBe('EE') // provincia nascita
  })

  test('tipo documento mappato correttamente: IDENTE → CIDEN, PPORT → PASSO', () => {
    const base = {
      dataArrivo: new Date('2026-05-01'),
      dataPartenza: new Date('2026-05-02'),
      guestNome: 'X', guestCognome: 'Y',
      guestSesso: 'M',
      guestDataNascita: new Date('1990-01-01'),
      guestComuneNascitaIstat: 'H501',
      guestProvinciaNascita: 'RM',
      guestStatoNascitaIstat: '100000100',
      guestCittadinanzaIstat: '100000100',
      guestNumeroDocumento: 'X1',
      guestComuneRilascioIstat: 'H501',
      guestProvinciaRilascio: 'RM',
    }
    const fileIdent = generateAlloggiatiFile(codice, [{ ...base, guestTipoDocumento: 'IDENTE' }])
    const filePass = generateAlloggiatiFile(codice, [{ ...base, guestTipoDocumento: 'PPORT' }])
    // Posizione 11 (0-indexed) = tipo documento
    expect(fileIdent.split('\r\n')[1].split('\t')[11]).toBe('CIDEN')
    expect(filePass.split('\r\n')[1].split('\t')[11]).toBe('PASSO')
  })

  test('calcola notti di permanenza', () => {
    const ospite = {
      dataArrivo: new Date('2026-05-01'),
      dataPartenza: new Date('2026-05-05'), // 4 notti
      guestNome: 'X', guestCognome: 'Y',
      guestSesso: 'M',
      guestDataNascita: new Date('1990-01-01'),
      guestComuneNascitaIstat: 'H501',
      guestProvinciaNascita: 'RM',
      guestStatoNascitaIstat: '100000100',
      guestCittadinanzaIstat: '100000100',
      guestTipoDocumento: 'IDENTE',
      guestNumeroDocumento: 'X1',
      guestComuneRilascioIstat: 'H501',
      guestProvinciaRilascio: 'RM',
    }
    const file = generateAlloggiatiFile(codice, [ospite])
    const cols = file.split('\r\n')[1].split('\t')
    expect(cols[2]).toBe('4') // notti
  })

  test('cognome e nome in UPPERCASE', () => {
    const ospite = {
      dataArrivo: new Date('2026-05-01'),
      dataPartenza: new Date('2026-05-02'),
      guestNome: 'mario', guestCognome: 'rossi',
      guestSesso: 'M',
      guestDataNascita: new Date('1985-06-15'),
      guestComuneNascitaIstat: 'H501',
      guestProvinciaNascita: 'RM',
      guestStatoNascitaIstat: '100000100',
      guestCittadinanzaIstat: '100000100',
      guestTipoDocumento: 'IDENTE',
      guestNumeroDocumento: 'x1',
      guestComuneRilascioIstat: 'H501',
      guestProvinciaRilascio: 'RM',
    }
    const cols = generateAlloggiatiFile(codice, [ospite]).split('\r\n')[1].split('\t')
    expect(cols[3]).toBe('ROSSI')
    expect(cols[4]).toBe('MARIO')
    expect(cols[12]).toBe('X1') // numero doc uppercase
  })

  test('file vuoto (nessun ospite) → solo testata', () => {
    const file = generateAlloggiatiFile(codice, [])
    const lines = file.split('\r\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain(codice)
  })
})

describe('alloggiati — generaFileAlloggiati (wrapper Prisma)', () => {
  test('lancia se struttura senza codice', () => {
    const struttura = createTestStruttura({ alloggiatiCodiceStruttura: null })
    expect(() =>
      generaFileAlloggiati(struttura, [createTestPrenotazione()]),
    ).toThrow(/Codice struttura/)
  })

  test('skippa prenotazioni non valide', () => {
    const struttura = createTestStruttura()
    const prenValida = createTestPrenotazione()
    const prenInvalida = createTestPrenotazione({
      id: 'pren-invalid',
      guestSesso: null, // manca: invalida
    })
    const file = generaFileAlloggiati(struttura, [prenValida, prenInvalida])
    const lines = file.split('\r\n')
    // testata + solo la valida
    expect(lines).toHaveLength(2)
  })
})
