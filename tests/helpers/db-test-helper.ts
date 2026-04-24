/**
 * DB test helper — MODALITÀ MOCK (default, no DB reale necessario).
 *
 * Questo progetto usa **Neon serverless** in produzione. Setup di un test DB
 * reale richiede:
 *   - Postgres locale o Neon branch dedicato
 *   - Migrations + reset tra test
 *   - DATABASE_URL_TEST in `.env.test`
 *
 * Per integration test con DB REALE, vedi `tests/integration/README.md` —
 * setup documentato ma non codificato.
 *
 * Questo file fornisce helpers che usano `prismaMock` (DeepMockProxy) per
 * simulare il DB in memoria. Pragmatico e veloce: ~80% del valore di un
 * integration test "vero" senza dipendenze infrastrutturali.
 */

import { prismaMock } from './prisma-mock'
import {
  createTestHost, createTestStruttura, createTestUnita, createTestPrenotazione,
  type TestHost, type TestStruttura, type TestUnita, type TestPrenotazione,
} from '../fixtures/test-data'

export type TestWorld = {
  hostA: TestHost
  hostB: TestHost // per test multi-tenant
  strutturaA: TestStruttura
  strutturaB: TestStruttura
  unitaA: TestUnita
  unitaB: TestUnita
}

/**
 * Prepara un "mondo" di test con 2 host isolati. Utile per:
 *   - Multi-tenant isolation (host A ≠ host B)
 *   - Test booking (host A con camera disponibile)
 *
 * Non tocca il DB — popola il `prismaMock` con il necessario.
 */
export function setupTestWorld(): TestWorld {
  const hostA = createTestHost({
    id: 'host-a-001', nomeAzienda: 'Hotel A', email: 'a@test.it',
  })
  const hostB = createTestHost({
    id: 'host-b-002', nomeAzienda: 'Hotel B', email: 'b@test.it',
  })
  const strutturaA = createTestStruttura({
    id: 'strut-a-001', hostId: hostA.id, nome: 'Struttura A',
  })
  const strutturaB = createTestStruttura({
    id: 'strut-b-002', hostId: hostB.id, nome: 'Struttura B',
  })
  const unitaA = createTestUnita({
    id: 'unita-a-001', strutturaId: strutturaA.id, nome: 'Camera A',
  })
  const unitaB = createTestUnita({
    id: 'unita-b-002', strutturaId: strutturaB.id, nome: 'Camera B',
  })

  return { hostA, hostB, strutturaA, strutturaB, unitaA, unitaB }
}

/**
 * Popola il prismaMock con dati per una booking flow standard.
 * Chiamata in `beforeEach` dei test di booking.
 */
export function seedBookingFlow(world: TestWorld) {
  // Struttura lookup (findFirst) per strutturaId attiva
  prismaMock.struttura.findFirst.mockResolvedValue(world.strutturaA as never)
  prismaMock.struttura.findUnique.mockResolvedValue(world.strutturaA as never)

  // Unità lookup
  prismaMock.unitaPrenotabile.findFirst.mockResolvedValue(world.unitaA as never)
  prismaMock.unitaPrenotabile.findUnique.mockResolvedValue(
    { ...world.unitaA, struttura: world.strutturaA } as never,
  )

  // Nessuna prenotazione conflittuale di default
  prismaMock.prenotazione.findMany.mockResolvedValue([])
  prismaMock.prenotazione.findFirst.mockResolvedValue(null)

  // Crea prenotazione successfully. Il tipo Prisma è molto stretto, cast a
  // `unknown` per aggirare i generics DeepMockProxy senza compromettere il
  // comportamento runtime (il test mock non usa i tipi generati).
  ;(prismaMock.prenotazione.create as unknown as {
    mockImplementation: (fn: (args: unknown) => unknown) => void
  }).mockImplementation((args) => {
    const data = ((args as { data?: Record<string, unknown> } | undefined)?.data) ?? {}
    return createTestPrenotazione({ id: 'pren-new-001', ...data })
  })

  // Regole tariffa + tariffe periodo vuote (prezzo base)
  prismaMock.regolaTariffa.findMany.mockResolvedValue([])
  prismaMock.tariffaPeriodo.findMany.mockResolvedValue([])

  // Host di default per email
  prismaMock.host.findUnique.mockResolvedValue(world.hostA as never)

  return world
}

/** Reset esplicito dei mock (oltre al `beforeEach` globale di prisma-mock). */
export function resetAll() {
  // `mockReset(prismaMock)` è già fatto nel `beforeEach` di prisma-mock.ts
}

// ─── Seed per multi-tenant test ──────────────────────────────────────────────

/**
 * Scenario: 2 host, 2 prenotazioni (una per host). Testa che il filtro
 * `hostId` nelle query escluda correttamente l'altro host.
 */
export function seedMultiTenantScenario(world: TestWorld) {
  const prenA = createTestPrenotazione({
    id: 'pren-a-001', hostId: world.hostA.id,
    strutturaId: world.strutturaA.id, unitaId: world.unitaA.id,
    guestNome: 'Alice', guestEmail: 'alice@test.it',
  })
  const prenB = createTestPrenotazione({
    id: 'pren-b-002', hostId: world.hostB.id,
    strutturaId: world.strutturaB.id, unitaId: world.unitaB.id,
    guestNome: 'Bob', guestEmail: 'bob@test.it',
  })

  // `findMany` filtrato per hostId: restituisce SOLO la prenotazione dell'host
  ;(prismaMock.prenotazione.findMany as unknown as {
    mockImplementation: (fn: (args: unknown) => unknown) => void
  }).mockImplementation((args) => {
    const filters = args as { where?: { hostId?: string } } | undefined
    const hostId = filters?.where?.hostId
    const all = [prenA, prenB]
    return hostId ? all.filter((p) => p.hostId === hostId) : all
  })

  // `findFirst` con hostId filter: applica isolamento
  ;(prismaMock.prenotazione.findFirst as unknown as {
    mockImplementation: (fn: (args: unknown) => unknown) => void
  }).mockImplementation((args) => {
    const filters = args as { where?: { id?: string; hostId?: string } } | undefined
    const id = filters?.where?.id
    const hostId = filters?.where?.hostId
    const match = [prenA, prenB].find(
      (p) => (!id || p.id === id) && (!hostId || p.hostId === hostId),
    )
    return match ?? null
  })

  return { prenA, prenB }
}
