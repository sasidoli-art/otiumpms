# Test infrastructure

## Layout

```
tests/
  unit/         → test unitari (lib/ puro, helpers, funzioni stateless)
  integration/  → test API routes con Prisma mockato
  fixtures/     → factory dati test (test-data.ts)
  helpers/      → utility test (prisma-mock.ts, render helpers)
```

E2E Playwright è in `/e2e/` (root, fuori da questa cartella) per compatibilità con `playwright.config.ts` esistente.

## Comandi

```bash
npm run test            # Vitest watch mode (unit + integration)
npm run test:run        # Single run (CI)
npm run test:ui         # Interactive web UI
npm run test:coverage   # Coverage report
npm run test:e2e        # Playwright e2e (separato)
```

## Scrivere un test unitario

```ts
// tests/unit/lib/mio-modulo.test.ts
import { describe, test, expect } from 'vitest'
import { miaFunzione } from '@/lib/mio-modulo'

describe('miaFunzione', () => {
  test('ritorna valore atteso', () => {
    expect(miaFunzione(2)).toBe(4)
  })
})
```

## Scrivere un test con Prisma mock

```ts
import { prismaMock, mockFindPrenotazione } from '../../helpers/prisma-mock'
import { createTestPrenotazione } from '../../fixtures/test-data'

test('lookup prenotazione', async () => {
  mockFindPrenotazione({ guestNome: 'Mario' })
  // ora il tuo codice che usa `prisma.prenotazione.findUnique` vedrà il mock
})
```
