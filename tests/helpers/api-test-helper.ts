/**
 * Helper per testare le route API Next.js App Router.
 *
 * **Diverso da `node-mocks-http`** — quello è per Pages Router / Express.
 * App Router usa `NextRequest` standard Web API; le route handler sono funzioni
 * async invocabili direttamente:
 *
 *   const req = buildJsonRequest('POST', '/api/foo', { body: {...} })
 *   const res = await POST(req, { params: Promise.resolve({ id: 'x' }) })
 *   expect(res.status).toBe(200)
 *
 * Per auth:
 *   - Nei test file fai `vi.mock('next-auth')` in cima
 *   - Poi usa `mockAuthHost()` / `mockAuthAdmin()` / `mockAuthNone()` per settare
 *     il valore di ritorno di `getServerSession`.
 */

import { NextRequest } from 'next/server'
import { vi, type Mock } from 'vitest'

// ─── Costruttori NextRequest ────────────────────────────────────────────────

export type RequestOptions = {
  body?: unknown
  query?: Record<string, string>
  headers?: Record<string, string>
  cookies?: Record<string, string>
}

/**
 * Costruisce una NextRequest JSON per invocare route handler in test.
 * URL di default: `http://localhost:3000` — le route non leggono l'host,
 * conta solo il path + query.
 */
export function buildJsonRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  opts: RequestOptions = {},
): NextRequest {
  const url = new URL(path, 'http://localhost:3000')
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    url.searchParams.set(k, v)
  }

  const init: RequestInit = {
    method,
    headers: new Headers({
      'content-type': 'application/json',
      ...(opts.cookies
        ? { cookie: Object.entries(opts.cookies).map(([k, v]) => `${k}=${v}`).join('; ') }
        : {}),
      ...(opts.headers ?? {}),
    }),
  }

  if (opts.body !== undefined && method !== 'GET') {
    init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)
  }

  // Cast: Next.js NextRequest `RequestInit` ha `signal` non-nullable; il DOM
  // lib lo tipa nullable. Per i test il valore è sempre undefined, quindi
  // safe cast.
  return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1])
}

/** Shortcut per request pubblica (no auth). */
export function publicRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  opts: RequestOptions = {},
): NextRequest {
  return buildJsonRequest(method, path, opts)
}

// ─── Mock auth session ──────────────────────────────────────────────────────

/**
 * Auth session shapes compatibili con `HostSession | AdminSession | SuperAdminSession`.
 * Richiamare PRIMA della chiamata al route handler, dopo `vi.mock('next-auth')`.
 */

export type MockSession = {
  user: {
    id: string
    email: string
    name: string
    role: 'HOST' | 'ADMIN' | 'SUPERADMIN' | 'DIREZIONE' | 'STAFF'
    hostId: string | null
  }
} | null

/**
 * Ritorna il `getServerSession` mock già tipizzato come `Mock`.
 * Richiede che il test file abbia fatto `vi.mock('next-auth')` in cima.
 */
export async function getSessionMock(): Promise<Mock> {
  const mod = await import('next-auth')
  return mod.getServerSession as unknown as Mock
}

export async function mockAuthHost(hostId = 'host-test-001', overrides?: Partial<MockSession>) {
  const fn = await getSessionMock()
  fn.mockResolvedValue({
    user: {
      id: 'user-test-host',
      email: 'host@test.it',
      name: 'Host Test',
      role: 'HOST',
      hostId,
      ...(overrides?.user ?? {}),
    },
  })
}

export async function mockAuthAdmin(overrides?: Partial<MockSession>) {
  const fn = await getSessionMock()
  fn.mockResolvedValue({
    user: {
      id: 'user-test-admin',
      email: 'admin@test.it',
      name: 'Admin Test',
      role: 'ADMIN',
      hostId: null,
      ...(overrides?.user ?? {}),
    },
  })
}

export async function mockAuthSuperAdmin() {
  const fn = await getSessionMock()
  fn.mockResolvedValue({
    user: {
      id: 'user-test-superadmin',
      email: 'superadmin@test.it',
      name: 'SuperAdmin Test',
      role: 'SUPERADMIN',
      hostId: null,
    },
  })
}

export async function mockAuthNone() {
  const fn = await getSessionMock()
  fn.mockResolvedValue(null)
}

// ─── Response parsing helper ────────────────────────────────────────────────

export async function parseJsonResponse<T = unknown>(
  res: Response,
): Promise<{ status: number; body: T }> {
  const body = (await res.json()) as T
  return { status: res.status, body }
}

/** Params route dynamic — App Router richiede `Promise<{ ... }>` */
export function routeParams<T extends Record<string, string>>(p: T): { params: Promise<T> } {
  return { params: Promise.resolve(p) }
}
