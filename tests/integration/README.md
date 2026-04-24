# Integration test

Test che invocano direttamente i **route handler** di Next.js App Router.
Non c'è server HTTP intermedio — si chiama la funzione `POST`/`GET` esportata
dalla route come funzione async, con un `NextRequest` costruito a mano.

## Cosa testano

Pattern coperto:
- Validazione Zod (400 su body invalido)
- Autenticazione (401 su sessione mancante, 403 su ruolo sbagliato)
- Multi-tenant isolation (il filtro `where: { hostId }` viene applicato)
- Side-effect principali (record creato, notifica inviata, consenso registrato)
- Response shape (status code + body)

## Cosa NON testano

Senza un DB reale, **non** possiamo testare:
- Constraint unique a livello DB (es. email duplicata scatena `P2002`)
- Transazioni con rollback sotto race condition
- Cascade delete effettivi
- Full-text search / indici
- Performance query

Per quei casi serve setup DB reale (vedi sotto).

## DB reale (opzionale — setup manuale)

Se vuoi integration test con un vero Postgres:

1. Postgres locale o Neon branch dedicato
2. `.env.test` con `DATABASE_URL` separato
3. Script pre-test: `npx prisma db push` contro il test DB + seed
4. Script post-test: `TRUNCATE TABLE ... CASCADE`
5. `vitest.config.ts`: rimuovi il mock di `@/lib/db` per questi file specifici

Complessità stimata: ~1 giornata di setup + manutenzione ongoing. Non incluso
in questo repo di default — la maggior parte dei team usa mock-based approach
(quello che vedi qui) + e2e Playwright per i critical flow.

## Pattern standard

```ts
import { describe, test, expect, vi } from 'vitest'
import { POST } from '@/app/api/path/to/route/route'
import { buildJsonRequest, routeParams, parseJsonResponse, mockAuthHost } from '../../helpers/api-test-helper'
import { prismaMock } from '../../helpers/prisma-mock'

// Mock Prisma + next-auth PRIMA degli import concreti sopra
vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))

describe('POST /api/path', () => {
  test('scenario', async () => {
    await mockAuthHost('host-test-001')
    prismaMock.prenotazione.create.mockResolvedValue(/* ... */)

    const req = buildJsonRequest('POST', '/api/path', { body: { /* ... */ } })
    const res = await POST(req, routeParams({ id: 'x' }))
    const { status, body } = await parseJsonResponse(res)

    expect(status).toBe(201)
    expect(prismaMock.prenotazione.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ hostId: 'host-test-001' }) })
    )
  })
})
```
