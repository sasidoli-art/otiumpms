/**
 * Logger strutturato — backward compatible con i ~30 call sites esistenti
 * che usano `logger.info(msg, context?, data?)`.
 *
 * Evoluzioni:
 *  - `debug` level aggiunto (visibile solo in dev)
 *  - Output JSON strutturato in produzione (parsabile da Vercel Logs/Datadog/Loki)
 *  - Auto-invio a Sentry su `error` level (se errore fornito)
 *  - Helper `withTiming(name, fn)` per misurare + loggare durata operazioni
 *
 * API:
 *   logger.info(message, context?, data?)
 *   logger.debug(message, data?)
 *   logger.warn(message, context?, data?)
 *   logger.error(message, context?, data?)
 *   withTiming('booking.create', async () => { ... })
 */

import * as Sentry from '@sentry/nextjs'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const IS_PROD = process.env.NODE_ENV === 'production'

// ─── Core ──────────────────────────────────────────────────────────────────

function log(
  level: LogLevel,
  message: string,
  context?: string,
  data?: unknown,
): void {
  if (IS_PROD) {
    // JSON structured — leggibile da log aggregator (Vercel/Datadog/Loki)
    const line = {
      timestamp: new Date().toISOString(),
      level,
      msg: message,
      ...(context ? { context } : {}),
      ...(data !== undefined && data !== null ? { data } : {}),
    }
    const out = JSON.stringify(line, safeReplacer)
    if (level === 'error') console.error(out)
    else if (level === 'warn') console.warn(out)
    else if (level === 'debug') {
      // debug in prod: soppresso by default (riduce spam)
      // Rimuovi questo return se vuoi vedere debug anche in prod
      return
    }
    else console.log(out)
  } else {
    // Dev: human readable con prefisso + timestamp conciso
    const ts = new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm
    const prefix = `[${ts}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''}`
    if (level === 'error') console.error(prefix, message, data ?? '')
    else if (level === 'warn') console.warn(prefix, message, data ?? '')
    else if (level === 'debug') console.log(prefix, message, data ?? '')
    else console.log(prefix, message, data ?? '')
  }
}

/**
 * JSON.stringify replacer che evita dump di Error + limita stringhe lunghe.
 * Prima riga di Error.stack spesso è la più utile; il resto può esplodere i log.
 */
function safeReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.slice(0, 2000),
    }
  }
  if (typeof value === 'string' && value.length > 2000) {
    return value.slice(0, 2000) + '…[truncated]'
  }
  return value
}

// ─── Normalizza overload: (msg, context, data) o (msg, data) ──────────────

function normalizeArgs(
  contextOrData?: string | Record<string, unknown>,
  data?: unknown,
): { context: string | undefined; data: unknown } {
  if (typeof contextOrData === 'string') {
    return { context: contextOrData, data }
  }
  return { context: undefined, data: contextOrData }
}

// ─── API pubblica ──────────────────────────────────────────────────────────

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (IS_PROD) return // suppressed in prod
    log('debug', message, undefined, data)
  },

  info: (
    message: string,
    contextOrData?: string | Record<string, unknown>,
    data?: unknown,
  ) => {
    const { context, data: d } = normalizeArgs(contextOrData, data)
    log('info', message, context, d)
  },

  warn: (
    message: string,
    contextOrData?: string | Record<string, unknown>,
    data?: unknown,
  ) => {
    const { context, data: d } = normalizeArgs(contextOrData, data)
    log('warn', message, context, d)
  },

  error: (
    message: string,
    contextOrData?: string | Record<string, unknown>,
    data?: unknown,
  ) => {
    const { context, data: d } = normalizeArgs(contextOrData, data)
    log('error', message, context, d)

    // Auto-send to Sentry se abbiamo un vero Error nel payload
    const err = extractError(d)
    if (err && IS_PROD) {
      Sentry.captureException(err, {
        tags: context ? { context } : undefined,
        extra: d && typeof d === 'object' ? (d as Record<string, unknown>) : undefined,
      })
    } else if (!err && IS_PROD) {
      // Error "semantico" senza Error instance — cattura come message
      Sentry.captureMessage(message, {
        level: 'error',
        tags: context ? { context } : undefined,
        extra: d && typeof d === 'object' ? (d as Record<string, unknown>) : undefined,
      })
    }
  },
}

function extractError(data: unknown): Error | null {
  if (data instanceof Error) return data
  if (data && typeof data === 'object' && 'error' in data) {
    const e = (data as { error: unknown }).error
    if (e instanceof Error) return e
  }
  return null
}

// ─── withTiming helper ─────────────────────────────────────────────────────

/**
 * Wrappa una operazione async con misurazione durata.
 * - Success: log debug con `durationMs`
 * - Failure: log error + rilancia l'errore
 *
 * Uso:
 *   const result = await withTiming('booking.create', async () => {
 *     return await prisma.prenotazione.create(...)
 *   })
 */
export async function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const durationMs = Date.now() - start
    // Usa debug in dev, info in prod solo se lento (>500ms)
    if (!IS_PROD || durationMs > 500) {
      logger.info(`${name} completed`, { durationMs })
    }
    return result
  } catch (error) {
    const durationMs = Date.now() - start
    logger.error(`${name} failed`, name, {
      durationMs,
      error: error instanceof Error ? error : new Error(String(error)),
    })
    throw error
  }
}

// ─── Version/environment banner ────────────────────────────────────────────

/** Info ambiente per debug (stampate al boot del server). */
export function logEnvironmentBanner() {
  if (!IS_PROD) return
  logger.info('Server avviato', 'boot', {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    region: process.env.VERCEL_REGION,
  })
}
