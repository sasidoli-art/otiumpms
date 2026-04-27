/**
 * Rate limiter in-memory per endpoint pubblici.
 * Usa una finestra scorrevole (sliding window) per IP.
 * Non richiede Redis — adatto a deployment single-instance (Vercel/Node).
 *
 * Uso:
 *   const { allowed, retryAfter } = rateLimit(ip, { windowMs: 60_000, max: 10 })
 *   if (!allowed) return NextResponse.json({ error: 'Troppe richieste' }, { status: 429 })
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Pulizia automatica ogni 5 minuti per evitare memory leak
const store = new Map<string, RateLimitEntry>()
let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60 * 1000) return
  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}

export interface RateLimitOptions {
  /** Durata della finestra in millisecondi */
  windowMs: number
  /** Numero massimo di richieste per finestra */
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Secondi prima del reset (utile per l'header Retry-After) */
  retryAfter: number
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    const resetAt = now + options.windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: options.max - 1, retryAfter: 0 }
  }

  if (entry.count >= options.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  entry.count++
  return {
    allowed: true,
    remaining: options.max - entry.count,
    retryAfter: 0,
  }
}

/**
 * Estrae l'IP reale dalla request (funziona con Vercel, Cloudflare e proxy standard).
 */
export function getClientIp(req: Request): string {
  const forwarded = req instanceof Request
    ? req.headers.get('x-forwarded-for')
    : null
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

// ───────────────────────────────────────────────────────────────────────────
// Presets centralizzati + helper checkRateLimit
// (P4 design: definizione una volta sola dei limiti per categoria di endpoint
// invece di ripeterli inline in ogni route).
// ───────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'

export type RateLimitPreset =
  | 'public:search'   // ricerca disponibilita` (alta freq.)
  | 'public:booking'  // POST prenota — limite stretto
  | 'public:checkin'  // submit check-in
  | 'public:wifi'     // captive portal
  | 'public:ical'     // feed iCal (booking.com fa polling)
  | 'host:read'       // GET su /api/host/*
  | 'host:write'      // POST/PATCH/DELETE su /api/host/*
  | 'admin:all'       // /api/admin/*
  | 'webhook:all'     // /api/webhooks/*
  | 'auth:login'      // brute force protection
  | 'auth:register'   // anti-abuse signup

const PRESETS: Record<RateLimitPreset, RateLimitOptions> = {
  'public:search':   { windowMs: 60_000,    max: 60  },
  'public:booking':  { windowMs: 60_000,    max: 10  },
  'public:checkin':  { windowMs: 60_000,    max: 20  },
  'public:wifi':     { windowMs: 60_000,    max: 30  },
  'public:ical':     { windowMs: 3_600_000, max: 60  },
  'host:read':       { windowMs: 60_000,    max: 120 },
  'host:write':      { windowMs: 60_000,    max: 30  },
  'admin:all':       { windowMs: 60_000,    max: 200 },
  'webhook:all':     { windowMs: 60_000,    max: 500 },
  'auth:login':      { windowMs: 300_000,   max: 5   },
  'auth:register':   { windowMs: 3_600_000, max: 3   },
}

/**
 * Helper "drop-in" per le API routes: ritorna NextResponse 429 se l'IP ha
 * superato il limite per il preset, altrimenti `null` (procedi con la logica).
 *
 * Uso:
 *   export async function POST(req: NextRequest) {
 *     const blocked = checkRateLimit(req, 'public:booking')
 *     if (blocked) return blocked
 *     // ... logica della route
 *   }
 */
export function checkRateLimit(req: Request, preset: RateLimitPreset, customKey?: string): NextResponse | null {
  const ip = getClientIp(req)
  const key = `rl:${preset}:${customKey ?? ip}`
  const result = rateLimit(key, PRESETS[preset])

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Troppe richieste. Riprova tra qualche istante.',
        code: 'RATE_LIMITED',
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }
  return null
}
