/**
 * Integration test — POST /api/book/[strutturaId]/camere/prenota
 *
 * Scope realistico (senza DB reale):
 *   - Validazione Zod → 422 su dati invalidi
 *   - Struttura non trovata → 404
 *   - Unità non trovata / non appartiene a struttura → 404
 *   - Capacità insufficiente → 422
 *
 * Il caso "success completo" richiederebbe mock di:
 *   - prisma.$transaction (esegue la callback con tx → serve mock del pattern)
 *   - @/lib/consent, @/lib/email, @/lib/crm, @/lib/audit, @/lib/guest-pin
 *   - prisma.disponibilita, prisma.chat, prisma.userConsent
 * Per non trasformare il test in un teatro di mock, la success path è marcata
 * come `todo` — va coperta da e2e Playwright (dove il DB è reale).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../helpers/prisma-mock'
import { buildJsonRequest, routeParams, parseJsonResponse } from '../../helpers/api-test-helper'
import { setupTestWorld, seedBookingFlow } from '../../helpers/db-test-helper'

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
// Side-effect libs — neutralized
vi.mock('@/lib/email', () => ({
  sendEmailConfermaRicezione: vi.fn().mockResolvedValue(undefined),
  sendEmailNuovaPrenotazione: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/consent', () => ({
  registraConsenso: vi.fn().mockResolvedValue({ id: 'consent-1' }),
}))
vi.mock('@/lib/crm', () => ({
  upsertOspiteFromBooking: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/comuni-tassa-soggiorno', () => ({
  calcolaTassaSuggerita: vi.fn().mockReturnValue(0),
}))
vi.mock('@/lib/guest-pin', () => ({
  generateUniquePin: vi.fn().mockResolvedValue('1234'),
}))

import { POST } from '@/app/api/book/[strutturaId]/camere/prenota/route'

function validPayload(overrides: Record<string, unknown> = {}) {
  const oggi = new Date()
  const domani = new Date(oggi); domani.setDate(domani.getDate() + 1)
  const dopodomani = new Date(oggi); dopodomani.setDate(dopodomani.getDate() + 4)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return {
    unitaId: 'c1234567890123456789012345', // cuid-like
    dataArrivo: fmt(domani),
    dataPartenza: fmt(dopodomani),
    adulti: 2,
    bambini: 0,
    etaBambini: [],
    lettoExtra: false,
    guestNome: 'Mario',
    guestCognome: 'Rossi',
    guestEmail: 'mario@example.com',
    guestTelefono: '+393331234567',
    guestLingua: 'it',
    consensi: { tos: true, privacy: true, marketing: false },
    ...overrides,
  }
}

describe('POST /api/book/[strutturaId]/camere/prenota', () => {
  beforeEach(() => {
    setupTestWorld()
  })

  test('422 su body invalido (email malformata)', async () => {
    const req = buildJsonRequest('POST', '/api/book/strut-a-001/camere/prenota', {
      body: validPayload({ guestEmail: 'not-an-email' }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'strut-a-001' }))
    const { status, body } = await parseJsonResponse<{ error: string; details?: unknown }>(res)
    expect(status).toBe(422)
    expect(body.error).toMatch(/non validi/i)
  })

  test('422 su consensi mancanti (tos=false)', async () => {
    const req = buildJsonRequest('POST', '/api/book/strut-a-001/camere/prenota', {
      body: validPayload({ consensi: { tos: false, privacy: true, marketing: false } }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'strut-a-001' }))
    expect(res.status).toBe(422)
  })

  test('422 su date invertite (partenza < arrivo)', async () => {
    const oggi = new Date()
    const domani = new Date(oggi); domani.setDate(domani.getDate() + 1)
    const ieri = new Date(oggi); ieri.setDate(ieri.getDate() - 1)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)

    const req = buildJsonRequest('POST', '/api/book/strut-a-001/camere/prenota', {
      body: validPayload({ dataArrivo: fmt(domani), dataPartenza: fmt(ieri) }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'strut-a-001' }))
    expect(res.status).toBe(422)
  })

  test('400 su body JSON malformato', async () => {
    const req = buildJsonRequest('POST', '/api/book/strut-a-001/camere/prenota', {
      body: '{invalid json',
    })
    const res = await POST(req, routeParams({ strutturaId: 'strut-a-001' }))
    expect(res.status).toBe(400)
  })

  test('404 se struttura non trovata', async () => {
    prismaMock.struttura.findFirst.mockResolvedValue(null)
    const req = buildJsonRequest('POST', '/api/book/non-esiste/camere/prenota', {
      body: validPayload(),
    })
    const res = await POST(req, routeParams({ strutturaId: 'non-esiste' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(404)
    expect(body.error).toMatch(/Struttura/i)
  })

  test('404 se unità non appartiene alla struttura', async () => {
    const world = setupTestWorld()
    prismaMock.struttura.findFirst.mockResolvedValue(world.strutturaA as never)
    prismaMock.unitaPrenotabile.findFirst.mockResolvedValue(null) // unità non trovata

    // unitaId deve essere un cuid valido per passare Zod; il 404 arriva dal
    // lookup vuoto (findFirst → null), non dalla validazione
    const req = buildJsonRequest('POST', '/api/book/strut-a-001/camere/prenota', {
      body: validPayload({ unitaId: 'c9999999999999999999999999' }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'strut-a-001' }))
    expect(res.status).toBe(404)
  })

  test('422 su capacità camera insufficiente', async () => {
    const world = setupTestWorld()
    seedBookingFlow(world)
    // Unità con capacita 2 + lettiExtra 0 vs richiesta 5 ospiti
    prismaMock.unitaPrenotabile.findFirst.mockResolvedValue({
      ...world.unitaA,
      capacita: 2,
      lettiExtra: 0,
      tariffe: [],
    } as never)

    const req = buildJsonRequest('POST', '/api/book/strut-a-001/camere/prenota', {
      body: validPayload({ adulti: 5 }),
    })
    const res = await POST(req, routeParams({ strutturaId: 'strut-a-001' }))
    const { status, body } = await parseJsonResponse<{ error: string }>(res)
    expect(status).toBe(422)
    expect(body.error).toMatch(/Capacit[aà]/i)
  })

  // Success full-path: richiede mock di $transaction + 6 side-effect lib
  // → meglio testato in e2e Playwright con DB reale
  test.todo('201 con prenotazione valida — success path')
  test.todo('409 se race condition su stesso slot')
  test.todo('genera checkInToken + PIN')
  test.todo('registra consensi termini_servizio + privacy_ospite')
  test.todo('crea Chat collegata alla prenotazione')
  test.todo('invia email conferma ricezione + notifica host')
})
