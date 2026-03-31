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
