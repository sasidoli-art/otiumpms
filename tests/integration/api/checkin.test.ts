/**
 * Integration test — POST /api/checkin/[token]/complete
 *
 * Route pubblica (no auth host) — accesso via `checkInToken` univoco.
 * Stati gestiti:
 *   - 404 se token non matcha nessuna prenotazione
 *   - 410 se prenotazione ANNULLATA
 *   - 409 se già VERIFICATO (non si può rifare)
 *   - 400 se documento o firma mancanti (validazione manuale, non Zod)
 *
 * Success path esegue `prisma.$transaction` con update Prenotazione + create
 * Accompagnatore[] + create Notifica. Mock $transaction necessario.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../helpers/prisma-mock'
import { buildJsonRequest, routeParams, parseJsonResponse } from '../../helpers/api-test-helper'
import { createTestPrenotazione } from '../../fixtures/test-data'

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/email', () => ({
  sendEmailCheckInCompletato: vi.fn().mockResolvedValue(undefined),
  sendEmailGeneric: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from '@/app/api/checkin/[token]/complete/route'

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    // Step 1
    guestNome: 'Mario',
    guestCognome: 'Rossi',
    guestTelefono: '+393331234567',
    guestSesso: 'M',
    guestDataNascita: '1985-06-15',
    guestLuogoNascita: 'Roma',
    guestComuneNascitaIstat: 'H501',
    guestProvinciaNascita: 'RM',
    guestStatoNascitaIstat: '100000100',
    guestCittadinanzaIstat: '100000100',
    guestCodiceFiscale: 'RSSMRA85H15H501Z',
    // Step 2
    guestTipoDocumento: 'IDENTE',
    guestNumeroDocumento: 'CA12345AB',
    guestLuogoRilascio: 'Roma',
    guestComuneRilascioIstat: 'H501',
    guestProvinciaRilascio: 'RM',
    fotoDocumentoFronte: null,
    fotoDocumentoRetro: null,
    // Step 3
    accompagnatori: [],
    // Step 4
    firmaBase64: 'data:image/png;base64,iVBORw0KGg',
    accTermini: true,
    accPrivacy: true,
    accMarketing: false,
    ...overrides,
  }
}

function seedPrenotazione(overrides: Record<string, unknown> = {}) {
  const pren = {
    ...createTestPrenotazione(),
    statoCheckIn: 'NON_INIZIATO' as const,
    struttura: { id: 'strut-test-001', nome: 'Hotel Test', messaggioChiusura: null },
    unita: { nome: 'Camera 101' },
    host: { nomeAzienda: 'Hotel Test', telefono: null, moduliAttivi: '{}' },
    ...overrides,
  }
  prismaMock.prenotazione.findUnique.mockResolvedValue(pren as never)
  return pren
}

describe('POST /api/checkin/[token]/complete', () => {
  beforeEach(() => {
    // Default: $transaction esegue la callback e ritorna il risultato
    prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        // Passa lo stesso prismaMock come tx (ha tutti i metodi)
        return (cb as (tx: typeof prismaMock) => unknown)(prismaMock)
      }
      return []
    })
  })

  test('404 se token non trova prenotazione', async () => {
    prismaMock.prenotazione.findUnique.mockResolvedValue(null)
    const req = buildJsonRequest('POST', '/api/checkin/token-invalid/complete', {
      body: validBody(),
    })
    const res = await POST(req, routeParams({ token: 'token-invalid' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(404)
    expect(body.error).toMatch(/non valido/i)
  })

  test('410 se prenotazione ANNULLATA', async () => {
    seedPrenotazione({ stato: 'ANNULLATA' })
    const req = buildJsonRequest('POST', '/api/checkin/token-x/complete', {
      body: validBody(),
    })
    const res = await POST(req, routeParams({ token: 'token-x' }))
    expect(res.status).toBe(410)
  })

  test('409 se check-in già VERIFICATO', async () => {
    seedPrenotazione({ statoCheckIn: 'VERIFICATO' })
    const req = buildJsonRequest('POST', '/api/checkin/token-x/complete', {
      body: validBody(),
    })
    const res = await POST(req, routeParams({ token: 'token-x' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(409)
    expect(body.error).toMatch(/già verificato/i)
  })

  test('400 se documento mancante', async () => {
    seedPrenotazione()
    const req = buildJsonRequest('POST', '/api/checkin/token-x/complete', {
      body: validBody({ guestTipoDocumento: null, guestNumeroDocumento: null }),
    })
    const res = await POST(req, routeParams({ token: 'token-x' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(400)
    expect(body.error).toMatch(/documento/i)
  })

  test('400 se firma mancante', async () => {
    seedPrenotazione()
    const req = buildJsonRequest('POST', '/api/checkin/token-x/complete', {
      body: validBody({ firmaBase64: null }),
    })
    const res = await POST(req, routeParams({ token: 'token-x' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(400)
    expect(body.error).toMatch(/firma/i)
  })

  test('success → chiama prisma.prenotazione.update con statoCheckIn=ONLINE_COMPLETATO + regCardFirmata', async () => {
    seedPrenotazione()
    prismaMock.prenotazione.update.mockResolvedValue({ id: 'pren-test-001' } as never)

    const req = buildJsonRequest('POST', '/api/checkin/token-x/complete', {
      body: validBody(),
    })
    const res = await POST(req, routeParams({ token: 'token-x' }))
    expect(res.status).toBe(200)

    // Verifica i campi critici dell'update
    expect(prismaMock.prenotazione.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statoCheckIn: 'ONLINE_COMPLETATO',
          regCardFirmata: true,
          checkInCompletato: true,
          regCardAccTermini: true,
          regCardAccPrivacy: true,
        }),
      }),
    )
  })

  test('success con 2 accompagnatori → chiama accompagnatore.create 2 volte', async () => {
    seedPrenotazione()
    prismaMock.prenotazione.update.mockResolvedValue({ id: 'pren-test-001' } as never)
    prismaMock.accompagnatore.create.mockResolvedValue({ id: 'acc-x' } as never)

    const req = buildJsonRequest('POST', '/api/checkin/token-x/complete', {
      body: validBody({
        accompagnatori: [
          {
            nome: 'Laura', cognome: 'Bianchi',
            sesso: 'F', dataNascita: '1990-03-20',
            luogoNascita: 'Milano', provinciaNascita: 'MI',
            comuneNascitaIstat: 'F205', statoNascitaIstat: '100000100',
            cittadinanzaIstat: '100000100',
            tipoDocumento: 'IDENTE', numeroDocumento: 'CA98765YZ',
            comuneRilascioIstat: 'F205', provinciaRilascio: 'MI',
          },
          {
            nome: 'Luca', cognome: 'Rossi',
            sesso: 'M', dataNascita: '2015-01-01',
            luogoNascita: 'Roma', provinciaNascita: 'RM',
            comuneNascitaIstat: 'H501', statoNascitaIstat: '100000100',
            cittadinanzaIstat: '100000100',
            tipoDocumento: 'ALTRO', numeroDocumento: 'none',
            comuneRilascioIstat: 'H501', provinciaRilascio: 'RM',
            isMinore: true,
          },
        ],
      }),
    })
    const res = await POST(req, routeParams({ token: 'token-x' }))
    expect(res.status).toBe(200)
    expect(prismaMock.accompagnatore.create).toHaveBeenCalledTimes(2)
  })

  test('success → crea Notifica per l\'host', async () => {
    seedPrenotazione()
    prismaMock.prenotazione.update.mockResolvedValue({ id: 'pren-test-001' } as never)
    prismaMock.notifica.create.mockResolvedValue({ id: 'notif-x' } as never)

    const req = buildJsonRequest('POST', '/api/checkin/token-x/complete', {
      body: validBody(),
    })
    await POST(req, routeParams({ token: 'token-x' }))

    expect(prismaMock.notifica.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hostId: 'host-test-001',
          tipo: expect.any(String),
        }),
      }),
    )
  })
})
