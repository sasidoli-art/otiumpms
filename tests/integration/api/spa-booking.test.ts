/**
 * Integration test — POST /api/book/[strutturaId]/spa/prenota
 *
 * Route pubblica (no auth). Il WAIVER è un endpoint separato
 * (`/api/spa/waiver`, chiamato step successivo), quindi questa route NON
 * accetta `condizioni`/`allergie`/`zoneEvitare` — quelli vivono sul waiver.
 *
 * Scope test:
 *   - 404 struttura inesistente
 *   - 422 body invalido
 *   - 422 senza trattamento né percorso
 *   - 400 data nel passato
 *   - 404 trattamento non prenotabile online
 *   - 409 conflitto terapista / cabina
 *   - 200 creazione success + verifica hostId corretto (multi-tenant)
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../helpers/prisma-mock'
import { buildJsonRequest, routeParams, parseJsonResponse } from '../../helpers/api-test-helper'

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/email', () => ({
  sendEmailConfermaAppuntamentoSpa: vi.fn().mockResolvedValue(undefined),
  sendEmailNotificaNuovoAppuntamentoSpa: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from '@/app/api/book/[strutturaId]/spa/prenota/route'

function validPayload(overrides: Record<string, unknown> = {}) {
  const dataFutura = new Date()
  dataFutura.setDate(dataFutura.getDate() + 7)
  dataFutura.setHours(15, 0, 0, 0)
  return {
    trattamentoId: 'c1234567890tratt',
    terapistaId: 'c1234567890terap',
    cabinaId: 'c1234567890cabin',
    dataOra: dataFutura.toISOString(),
    durata: 60,
    prezzoTotale: 80,
    guestNome: 'Mario',
    guestCognome: 'Rossi',
    guestEmail: 'mario@example.com',
    ...overrides,
  }
}

function seedStruttura(hostId = 'host-test-001') {
  prismaMock.struttura.findFirst.mockResolvedValue({
    hostId,
    host: { nomeAzienda: 'Hotel Test', user: { email: 'host@test.it' } },
  } as never)
}

function seedTrattamentoAttivo() {
  prismaMock.trattamentoSpa.findFirst.mockResolvedValue({
    id: 'c1234567890tratt',
    nome: 'Massaggio Relax',
    attivo: true,
    prenotabileOnline: true,
  } as never)
}

describe('POST /api/book/[strutturaId]/spa/prenota', () => {
  beforeEach(() => {
    // Default: nessun conflitto terapista / cabina
    prismaMock.appuntamentoSpa.findFirst.mockResolvedValue(null)
    prismaMock.appuntamentoSpa.create.mockResolvedValue({
      id: 'appt-new-001',
    } as never)
  })

  test('404 se struttura non trovata', async () => {
    prismaMock.struttura.findFirst.mockResolvedValue(null)
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: validPayload(),
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    const { status } = await parseJsonResponse(res)
    expect(status).toBe(404)
  })

  test('422 se email invalida', async () => {
    seedStruttura()
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: validPayload({ guestEmail: 'not-email' }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    expect(res.status).toBe(422)
  })

  test('422 se né trattamentoId né percorsoId forniti', async () => {
    seedStruttura()
    const payload = validPayload({ trattamentoId: undefined })
    delete (payload as Record<string, unknown>).percorsoId
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', { body: payload })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(422)
    expect(body.error).toMatch(/trattamento|percorso/i)
  })

  test('400 se data nel passato', async () => {
    seedStruttura()
    const passato = new Date()
    passato.setDate(passato.getDate() - 1)
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: validPayload({ dataOra: passato.toISOString() }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(400)
    expect(body.error).toMatch(/passato/i)
  })

  test('404 se trattamento non prenotabile online', async () => {
    seedStruttura()
    prismaMock.trattamentoSpa.findFirst.mockResolvedValue(null) // non trovato / non attivo
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: validPayload(),
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    expect(res.status).toBe(404)
  })

  test('409 se terapista ha conflitto nello slot', async () => {
    seedStruttura()
    seedTrattamentoAttivo()

    const dataFutura = new Date()
    dataFutura.setDate(dataFutura.getDate() + 7)
    dataFutura.setHours(15, 0, 0, 0)
    // Conflitto: appuntamento 14:30-15:30 mentre noi prenotiamo 15:00-16:00
    const conflittoInizio = new Date(dataFutura)
    conflittoInizio.setMinutes(conflittoInizio.getMinutes() - 30)

    prismaMock.appuntamentoSpa.findFirst.mockResolvedValueOnce({
      id: 'conflitto-1',
      dataOra: conflittoInizio,
      durata: 60,
    } as never)

    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: validPayload({ dataOra: dataFutura.toISOString() }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(409)
    expect(body.error).toMatch(/terapista/i)
  })

  test('201/200 success → appuntamentoSpa.create chiamato con hostId della struttura', async () => {
    seedStruttura('host-a-001') // host specifico
    seedTrattamentoAttivo()

    const req = buildJsonRequest('POST', '/api/book/strut-a-001/spa/prenota', {
      body: validPayload(),
    })
    const res = await POST(req, routeParams({ strutturaId: 'strut-a-001' }))
    expect([200, 201]).toContain(res.status)

    // Multi-tenant: hostId della struttura è stato usato per create
    expect(prismaMock.appuntamentoSpa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hostId: 'host-a-001',
          durata: 60,
          prezzoTotale: 80,
        }),
      }),
    )
  })

  test('success con percorsoId invece di trattamentoId', async () => {
    seedStruttura()
    prismaMock.percorsoBenessere.findFirst.mockResolvedValue({
      id: 'c1234567890percor',
      nome: 'Percorso Benessere',
      attivo: true,
    } as never)

    const payload = validPayload({
      trattamentoId: undefined,
      percorsoId: 'c1234567890percor',
    })

    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', { body: payload })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    expect([200, 201]).toContain(res.status)
    expect(prismaMock.appuntamentoSpa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          percorsoId: 'c1234567890percor',
          trattamentoId: null,
        }),
      }),
    )
  })

  // TODO: testare in e2e con DB reale — richiede waiver endpoint chain
  test.todo('waiver percorso sano (dichiarazioneNessuna=true) via /api/spa/waiver separato')
  test.todo('waiver completo con condizioni/allergie/zone via /api/spa/waiver')
})
