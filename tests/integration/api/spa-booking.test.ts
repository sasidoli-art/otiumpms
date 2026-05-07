/**
 * Integration test — POST /api/book/[strutturaId]/spa/prenota
 *
 * Il nuovo contratto richiede waiver + pagamento + consensi nel body.
 * Il conflitto terapista/cabina avviene dentro $transaction.
 * assegnaCabina è mockato per restituire null (nessuna cabina auto-assegnata).
 *
 * Scope test:
 *   - 422 body invalido (waiver/pagamento mancanti)
 *   - 422 senza trattamento né percorso
 *   - 400 data nel passato
 *   - 404 struttura inesistente (richiede body valido)
 *   - 404 trattamento non prenotabile online
 *   - 409 conflitto terapista nello slot
 *   - 201 success → verifica multi-tenant hostId
 *   - 201 success con percorsoId invece di trattamentoId
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../helpers/prisma-mock'
import { buildJsonRequest, routeParams, parseJsonResponse } from '../../helpers/api-test-helper'

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/spa-availability', () => ({
  assegnaCabina: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/crm-sync', () => ({
  syncOspiteCRM: vi.fn().mockResolvedValue({ ospiteId: 'ospite-1', isNew: true }),
}))
vi.mock('@/lib/consent', () => ({
  registraConsenso: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/email', () => ({
  sendEmailConfermaAppuntamentoSpa: vi.fn().mockResolvedValue(undefined),
  sendEmailNotificaNuovoAppuntamentoSpa: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

import { POST } from '@/app/api/book/[strutturaId]/spa/prenota/route'

function validPayload(overrides: Record<string, unknown> = {}) {
  const dataFutura = new Date()
  dataFutura.setDate(dataFutura.getDate() + 7)
  dataFutura.setHours(15, 0, 0, 0)
  return {
    trattamentoId: 'c1234567890tratt',
    terapistaId: 'c1234567890terap',
    dataOra: dataFutura.toISOString(),
    guestNome: 'Mario',
    guestCognome: 'Rossi',
    guestEmail: 'mario@example.com',
    guestLingua: 'it',
    waiver: {
      zoneTrattate: [],
      zoneEvitare: [],
      incinta: false,
      condizioni: [],
      accettazioneTermini: true as const,
      accettazionePrivacy: true as const,
      consensoFoto: false,
    },
    pagamento: { metodo: 'CONTANTI' },
    consensi: { privacy: true as const, tos: true as const, salute: true as const },
    ...overrides,
  }
}

function seedStruttura(hostId = 'host-test-001') {
  prismaMock.struttura.findFirst.mockResolvedValue({
    hostId,
    nome: 'Hotel Test',
    host: { nomeAzienda: 'Hotel Test', user: { email: 'host@test.it' } },
  } as never)
}

function seedTrattamento() {
  prismaMock.trattamentoSpa.findFirst.mockResolvedValue({
    id: 'c1234567890tratt', nome: 'Massaggio Relax',
    attivo: true, prenotabileOnline: true, durata: 60, prezzo: 80,
  } as never)
}

describe('POST /api/book/[strutturaId]/spa/prenota', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (cb: unknown) =>
      (cb as (tx: typeof prismaMock) => Promise<string>)(prismaMock),
    )
    prismaMock.appuntamentoSpa.findFirst.mockResolvedValue(null)
    prismaMock.appuntamentoSpa.create.mockResolvedValue({ id: 'appt-new-001' } as never)
    prismaMock.waiverSpa.create.mockResolvedValue({ id: 'waiver-1' } as never)
    prismaMock.pagamentoSpa.create.mockResolvedValue({ id: 'pag-1' } as never)
    prismaMock.notifica.create.mockResolvedValue({ id: 'notif-1' } as never)
  })

  test('422 se body invalido (waiver mancante)', async () => {
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: { trattamentoId: 'c1234567890tratt', guestNome: 'Mario', guestEmail: 'a@b.it' },
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    expect(res.status).toBe(422)
  })

  test('422 se email invalida', async () => {
    seedStruttura()
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: validPayload({ guestEmail: 'not-email' }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    expect(res.status).toBe(422)
  })

  test('422 se né trattamentoId né percorsoId', async () => {
    seedStruttura()
    const payload = validPayload({ trattamentoId: null, percorsoId: null })
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', { body: payload })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(422)
    expect(body.error).toMatch(/trattamento|percorso/i)
  })

  test('400 se data nel passato', async () => {
    seedStruttura()
    seedTrattamento()
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

  test('404 se struttura non trovata', async () => {
    prismaMock.struttura.findFirst.mockResolvedValue(null)
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: validPayload(),
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    expect(res.status).toBe(404)
  })

  test('404 se trattamento non prenotabile online', async () => {
    seedStruttura()
    prismaMock.trattamentoSpa.findFirst.mockResolvedValue(null)
    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: validPayload(),
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    expect(res.status).toBe(404)
  })

  test('409 se terapista ha conflitto nello slot', async () => {
    seedStruttura()
    seedTrattamento()

    const dataFutura = new Date()
    dataFutura.setDate(dataFutura.getDate() + 7)
    dataFutura.setHours(15, 0, 0, 0)
    const conflittoInizio = new Date(dataFutura.getTime() - 30 * 60_000)

    // Il conflitto viene trovato dentro la $transaction
    prismaMock.appuntamentoSpa.findFirst.mockResolvedValueOnce({
      id: 'conflitto-1', dataOra: conflittoInizio, durata: 60,
    } as never)

    const req = buildJsonRequest('POST', '/api/book/x/spa/prenota', {
      body: validPayload({ dataOra: dataFutura.toISOString() }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'x' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(409)
    expect(body.error).toMatch(/terapista/i)
  })

  test('201 success → appuntamentoSpa.create con hostId della struttura (multi-tenant)', async () => {
    seedStruttura('host-a-001')
    seedTrattamento()

    const req = buildJsonRequest('POST', '/api/book/strut-a/spa/prenota', {
      body: validPayload(),
    })
    const res = await POST(req, routeParams({ strutturaId: 'strut-a' }))
    expect([200, 201]).toContain(res.status)

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

  test('201 success con percorsoId invece di trattamentoId', async () => {
    seedStruttura()
    prismaMock.percorsoBenessere.findFirst.mockResolvedValue({
      id: 'c1234567890percor', nome: 'Percorso Benessere',
      attivo: true, durataMinuti: 90, prezzo: 120,
    } as never)

    const payload = validPayload({ trattamentoId: null, percorsoId: 'c1234567890percor' })
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

  // TODO: testare in e2e con DB reale
  test.todo('waiver completo con condizioni/allergie/zone via body.waiver')
  test.todo('pagamento CAMERA_CREDIT con unitaId')
})
