/**
 * Prisma mock helper per unit test.
 *
 * Usa `vitest-mock-extended` per auto-mockare tutti i metodi del PrismaClient
 * (findUnique, create, update, ecc.) → ogni metodo diventa `vi.fn()`.
 *
 * In ogni test: `prismaMock.modello.metodo.mockResolvedValue(...)` per
 * scrivere il valore di ritorno atteso. `prismaMock.$reset()` tra test.
 *
 * IMPORTANTE: per far sì che il codice sotto test usi QUESTO mock invece del
 * client reale, fai il mock di `@/lib/db` all'inizio del file test:
 *
 *   vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
 */

import { beforeEach } from 'vitest'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import {
  createTestPrenotazione, createTestOspiteCRM, createTestAppuntamentoSpa,
  createTestWaiverSpa, createTestFattura, createTestHost, createTestStruttura,
  type TestPrenotazione, type TestOspiteCRM, type TestAppuntamentoSpa,
  type TestWaiverSpa, type TestFattura, type TestHost, type TestStruttura,
} from '../fixtures/test-data'

export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>()

beforeEach(() => {
  mockReset(prismaMock)
})

// ─── Helper shorthand per query comuni ──────────────────────────────────────

export function mockFindPrenotazione(data: Partial<TestPrenotazione> = {}) {
  const p = createTestPrenotazione(data)
  prismaMock.prenotazione.findUnique.mockResolvedValue(p as never)
  prismaMock.prenotazione.findFirst.mockResolvedValue(p as never)
  return p
}

export function mockFindOspite(data: Partial<TestOspiteCRM> = {}) {
  const o = createTestOspiteCRM(data)
  prismaMock.ospiteCRM.findUnique.mockResolvedValue(o as never)
  prismaMock.ospiteCRM.findFirst.mockResolvedValue(o as never)
  return o
}

export function mockFindAppuntamentoSpa(data: Partial<TestAppuntamentoSpa> = {}) {
  const a = createTestAppuntamentoSpa(data)
  prismaMock.appuntamentoSpa.findUnique.mockResolvedValue(a as never)
  prismaMock.appuntamentoSpa.findFirst.mockResolvedValue(a as never)
  return a
}

export function mockFindWaiver(data: Partial<TestWaiverSpa> = {}) {
  const w = createTestWaiverSpa(data)
  prismaMock.waiverSpa.findUnique.mockResolvedValue(w as never)
  prismaMock.waiverSpa.findFirst.mockResolvedValue(w as never)
  return w
}

export function mockFindFattura(data: Partial<TestFattura> = {}) {
  const f = createTestFattura(data)
  prismaMock.fattura.findUnique.mockResolvedValue(f as never)
  prismaMock.fattura.findFirst.mockResolvedValue(f as never)
  return f
}

export function mockFindHost(data: Partial<TestHost> = {}) {
  const h = createTestHost(data)
  prismaMock.host.findUnique.mockResolvedValue(h as never)
  prismaMock.host.findFirst.mockResolvedValue(h as never)
  return h
}

export function mockFindStruttura(data: Partial<TestStruttura> = {}) {
  const s = createTestStruttura(data)
  prismaMock.struttura.findUnique.mockResolvedValue(s as never)
  prismaMock.struttura.findFirst.mockResolvedValue(s as never)
  return s
}
