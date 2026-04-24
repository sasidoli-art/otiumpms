/**
 * Health check del sistema.
 *
 * Checks:
 *   - database: ping Postgres via `SELECT 1`
 *   - sentry: DSN configurato + client Sentry inizializzato
 *   - encryption: chiave valida (32 bytes hex)
 *   - required_env: variabili d'ambiente critiche presenti
 *
 * Stati:
 *   - `ok`: tutti i servizi operativi
 *   - `degraded`: almeno un servizio ha un warning (es. Sentry mancante in prod)
 *   - `down`: DB non raggiungibile — incident bloccante
 *
 * Usato da:
 *   - `/api/health` (endpoint pubblico per uptime checker)
 *   - `/superadmin/monitoring` dashboard interno
 *   - Test infrastructure (CI, smoke test post-deploy)
 */

import { prisma } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'

export type HealthServiceCheck = {
  status: 'ok' | 'warn' | 'error' | 'skipped'
  latencyMs?: number
  error?: string
  detail?: string
}

export type HealthReport = {
  status: 'ok' | 'degraded' | 'down'
  timestamp: string
  uptimeMs: number
  services: Record<string, HealthServiceCheck>
  version: {
    commit: string | null
    env: string
  }
}

const START_TIME = Date.now()

// Cache 10s per evitare DDoS via /api/health (uptime checkers possono pingare ogni 30s)
let cachedReport: { report: HealthReport; expiresAt: number } | null = null
const CACHE_TTL_MS = 10_000

export async function healthCheck(opts: { skipCache?: boolean } = {}): Promise<HealthReport> {
  if (!opts.skipCache && cachedReport && Date.now() < cachedReport.expiresAt) {
    return cachedReport.report
  }

  const services: Record<string, HealthServiceCheck> = {}

  // ─── Database ──────────────────────────────────────────────────────────
  services.database = await checkDatabase()

  // ─── Sentry ────────────────────────────────────────────────────────────
  services.sentry = checkSentry()

  // ─── Encryption key ────────────────────────────────────────────────────
  services.encryption = checkEncryption()

  // ─── Required env vars ─────────────────────────────────────────────────
  services.env = checkRequiredEnv()

  // Determina stato globale
  const states = Object.values(services).map((s) => s.status)
  let status: HealthReport['status']
  if (services.database.status === 'error') {
    status = 'down' // DB down = incident bloccante
  } else if (states.some((s) => s === 'error' || s === 'warn')) {
    status = 'degraded'
  } else {
    status = 'ok'
  }

  const report: HealthReport = {
    status,
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - START_TIME,
    services,
    version: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    },
  }

  cachedReport = { report, expiresAt: Date.now() + CACHE_TTL_MS }
  return report
}

// ────────────────────────────────────────────────────────────────────────────
// Single-service checks
// ────────────────────────────────────────────────────────────────────────────

async function checkDatabase(): Promise<HealthServiceCheck> {
  const start = Date.now()
  try {
    // Timeout 3s — se DB non risponde entro 3s consideriamolo giù
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DB query timeout (>3s)')), 3000),
    )
    await Promise.race([
      prisma.$queryRaw`SELECT 1 as ok`,
      timeout,
    ])
    const latencyMs = Date.now() - start
    return {
      status: latencyMs > 500 ? 'warn' : 'ok',
      latencyMs,
      detail: latencyMs > 500 ? `Latenza elevata: ${latencyMs}ms` : undefined,
    }
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message.slice(0, 200) : String(err),
      latencyMs: Date.now() - start,
    }
  }
}

function checkSentry(): HealthServiceCheck {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) {
    // In dev è OK non averlo, in prod è warning
    return process.env.NODE_ENV === 'production'
      ? { status: 'warn', detail: 'SENTRY_DSN mancante in produzione' }
      : { status: 'skipped', detail: 'Sentry disabilitato in dev' }
  }

  try {
    const client = Sentry.getClient?.()
    if (!client) {
      return { status: 'warn', detail: 'Client Sentry non inizializzato' }
    }
    return { status: 'ok' }
  } catch {
    return { status: 'warn', detail: 'Sentry client non accessibile' }
  }
}

function checkEncryption(): HealthServiceCheck {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    return process.env.NODE_ENV === 'production'
      ? { status: 'error', error: 'ENCRYPTION_KEY mancante in produzione' }
      : { status: 'warn', detail: 'Secrets in plain: (dev mode)' }
  }
  try {
    const buf = Buffer.from(key, 'hex')
    if (buf.length !== 32) {
      return { status: 'error', error: `ENCRYPTION_KEY wrong size: ${buf.length} bytes (expected 32)` }
    }
    return { status: 'ok' }
  } catch {
    return { status: 'error', error: 'ENCRYPTION_KEY non è hex valido' }
  }
}

function checkRequiredEnv(): HealthServiceCheck {
  const required = ['DATABASE_URL', 'NEXTAUTH_SECRET']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    return { status: 'error', error: `Env mancanti: ${missing.join(', ')}` }
  }
  return { status: 'ok' }
}
