/**
 * Integration test — Isolamento multi-tenant (SICUREZZA CRITICA).
 *
 * Con prisma mock non possiamo testare che il DB applichi davvero il filtro;
 * possiamo però verificare che:
 *   - Il codice APPLICHI il filtro `hostId` nelle query (se lo rimuovi, il
 *     test fallisce perché `findMany` viene chiamato senza la condizione)
 *   - Sessioni senza auth → 401
 *   - Sessioni di host diverso non sovrascrivono `hostId` nel body
 *
 * Per garanzia reale di isolamento (es. Row-Level Security) serve DB reale
 * + test che l'attacker non possa bypassare — vedi tests/integration/README.md.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../helpers/prisma-mock'
import {
  buildJsonRequest, routeParams, parseJsonResponse,
  mockAuthHost, mockAuthAdmin, mockAuthNone,
} from '../../helpers/api-test-helper'
import { setupTestWorld, seedMultiTenantScenario } from '../../helpers/db-test-helper'

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
  auditFromAuth: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { GET as getHostPrenotazioni } from '@/app/api/host/prenotazioni/route'

describe('Multi-tenant isolation — /api/host/prenotazioni', () => {
  beforeEach(() => {
    setupTestWorld()
  })

  test('401 se nessuna sessione', async () => {
    await mockAuthNone()
    const req = buildJsonRequest('GET', '/api/host/prenotazioni')
    const res = await getHostPrenotazioni(req)
    expect(res.status).toBe(401)
  })

  test('host A vede SOLO prenotazioni con hostId=A (filtro where applicato)', async () => {
    const world = setupTestWorld()
    const { prenA } = seedMultiTenantScenario(world)

    await mockAuthHost(world.hostA.id)

    const req = buildJsonRequest('GET', '/api/host/prenotazioni')
    const res = await getHostPrenotazioni(req)
    const { status, body } = await parseJsonResponse<Array<{ id: string; hostId: string }>>(res)

    expect(status).toBe(200)
    // La findMany del mock filtra per hostId: solo prenotazione di A
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe(prenA.id)
    expect(body[0].hostId).toBe(world.hostA.id)

    // Verifica che il filtro `where.hostId` sia stato applicato nella query
    expect(prismaMock.prenotazione.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hostId: world.hostA.id }),
      }),
    )
  })

  test('host B vede SOLO prenotazioni con hostId=B', async () => {
    const world = setupTestWorld()
    const { prenB } = seedMultiTenantScenario(world)

    await mockAuthHost(world.hostB.id)

    const req = buildJsonRequest('GET', '/api/host/prenotazioni')
    const res = await getHostPrenotazioni(req)
    const { body } = await parseJsonResponse<Array<{ id: string; hostId: string }>>(res)

    expect(body).toHaveLength(1)
    expect(body[0].id).toBe(prenB.id)
    expect(body[0].hostId).toBe(world.hostB.id)
  })

  test('il filtro where.hostId non è bypassabile da query param', async () => {
    const world = setupTestWorld()
    seedMultiTenantScenario(world)
    await mockAuthHost(world.hostA.id)

    // Proviamo a forzare hostId di B via query — non deve cambiare nulla
    const req = buildJsonRequest('GET', '/api/host/prenotazioni', {
      query: { hostId: world.hostB.id },
    })
    await getHostPrenotazioni(req)

    // Il where.hostId deve ancora essere dell'host autenticato (A)
    expect(prismaMock.prenotazione.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hostId: world.hostA.id }),
      }),
    )
  })

  test('GET filtra sempre soft-delete (deletedAt: null)', async () => {
    const world = setupTestWorld()
    seedMultiTenantScenario(world)
    await mockAuthHost(world.hostA.id)

    const req = buildJsonRequest('GET', '/api/host/prenotazioni')
    await getHostPrenotazioni(req)

    expect(prismaMock.prenotazione.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    )
  })

  test('admin (senza impersonation) → la logica di requireHostOrAdmin assegna un hostId', async () => {
    // requireHostOrAdmin per ADMIN senza hostId: fa lookup host e usa il primo.
    // Serve per test che ADMIN non veda tutti i host in /host/* (quello è /admin/*)
    const world = setupTestWorld()
    seedMultiTenantScenario(world)

    prismaMock.host.findFirst.mockResolvedValue(world.hostA as never)
    prismaMock.host.findUnique.mockResolvedValue(world.hostA as never)

    await mockAuthAdmin({
      user: {
        id: 'admin-1', email: 'admin@test.it', name: 'Admin',
        role: 'ADMIN', hostId: null,
      },
    })

    const req = buildJsonRequest('GET', '/api/host/prenotazioni')
    const res = await getHostPrenotazioni(req)

    // Admin è autorizzato ma impersona un host → query comunque filtrata per hostId
    expect(res.status).toBe(200)
    const callArgs = prismaMock.prenotazione.findMany.mock.calls[0]?.[0] as
      | { where?: { hostId?: string } }
      | undefined
    expect(callArgs?.where?.hostId).toBeTruthy()
  })
})

// TODO (richiedono DB reale):
//  - Tentativo di accesso diretto a /api/host/prenotazioni/[id-di-B] da sessione A → 404
//  - Modifica via PATCH del campo hostId nel body viene ignorata
//  - Impersonation admin → audit log registra l'operazione
