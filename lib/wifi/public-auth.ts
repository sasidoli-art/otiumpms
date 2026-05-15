/**
 * Public Wi-Fi API authentication + rate limiting.
 *
 * Le API pubbliche sotto `/api/public/wifi/*` si autenticano con un bearer token
 * `Authorization: ApiKey <key>`. La key in chiaro è mostrata SOLO a creation,
 * il DB conserva solo `sha256(key)`.
 *
 * Scopes (whitelist): "codes:read", "codes:write", "sessions:read",
 *                     "sessions:write", "devices:read", "bookings:write"
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'

export type WifiApiScope =
  | 'codes:read'
  | 'codes:write'
  | 'sessions:read'
  | 'sessions:write'
  | 'devices:read'
  | 'bookings:write'

export const ALL_SCOPES: WifiApiScope[] = [
  'codes:read', 'codes:write',
  'sessions:read', 'sessions:write',
  'devices:read', 'bookings:write',
]

export function hashApiKey(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

/**
 * Genera nuova API key.
 * Formato: `otwk_<32 hex>` (prefisso identificativo + 16 bytes random).
 * Returns: { plain, prefix } — `plain` da mostrare 1 volta all'utente.
 */
export function generateApiKey(): { plain: string; prefix: string } {
  const rand = randomBytes(16).toString('hex')
  const plain = `otwk_${rand}`
  const prefix = plain.slice(0, 12) // "otwk_xxxxxxx"
  return { plain, prefix }
}

// ─── Rate limiter in-memory (process-local) ────────────────────────────
// Per Vercel serverless va bene per low-volume. Per scale serve Upstash Redis.
interface RLEntry { count: number; resetAt: number }
const rlStore = new Map<string, RLEntry>()
let lastClean = Date.now()

function checkRateLimit(keyId: string, perMin: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  if (now - lastClean > 60_000) {
    lastClean = now
    for (const [k, v] of rlStore) if (v.resetAt < now) rlStore.delete(k)
  }
  const e = rlStore.get(keyId)
  if (!e || e.resetAt < now) {
    rlStore.set(keyId, { count: 1, resetAt: now + 60_000 })
    return { ok: true, retryAfterSec: 0 }
  }
  if (e.count >= perMin) return { ok: false, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) }
  e.count++
  return { ok: true, retryAfterSec: 0 }
}

export interface AuthorizedApiContext {
  hostId: string
  apiKeyId: string
  scopes: WifiApiScope[]
}

/**
 * Verifica auth + scope + modulo wifi attivo + rate limit.
 * Ritorna il context o una NextResponse 4xx.
 */
export async function requireWifiApiKey(
  req: NextRequest,
  requiredScope: WifiApiScope,
): Promise<AuthorizedApiContext | NextResponse> {
  const authHeader = req.headers.get('authorization') ?? ''
  const match = authHeader.match(/^ApiKey\s+(.+)$/i)
  if (!match) {
    return NextResponse.json(
      { error: 'Missing ApiKey header. Use: Authorization: ApiKey <your-key>' },
      { status: 401 },
    )
  }
  const plainKey = match[1].trim()
  if (!plainKey || plainKey.length < 16) {
    return NextResponse.json({ error: 'Malformed API key' }, { status: 401 })
  }

  const keyHash = hashApiKey(plainKey)
  const apiKey = await prisma.wifiApiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      hostId: true,
      scopes: true,
      revokedAt: true,
      expiresAt: true,
      rateLimitPerMin: true,
      host: { select: { moduliAttivi: true } },
    },
  })
  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }
  if (apiKey.revokedAt) {
    return NextResponse.json({ error: 'API key revoked' }, { status: 401 })
  }
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json({ error: 'API key expired' }, { status: 401 })
  }
  if (!isModuloAttivo(apiKey.host.moduliAttivi, 'wifi')) {
    return NextResponse.json({ error: 'Wi-Fi module not active on this host' }, { status: 403 })
  }
  if (!apiKey.scopes.includes(requiredScope)) {
    return NextResponse.json(
      { error: `Missing scope: ${requiredScope}`, availableScopes: apiKey.scopes },
      { status: 403 },
    )
  }

  // Rate limit per key
  const rl = checkRateLimit(apiKey.id, apiKey.rateLimitPerMin)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  // Touch lastUsedAt (fire-and-forget)
  prisma.wifiApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return {
    hostId: apiKey.hostId,
    apiKeyId: apiKey.id,
    scopes: apiKey.scopes as WifiApiScope[],
  }
}

/** Helper: rileva se return è auth context o error response */
export function isAuthError(x: AuthorizedApiContext | NextResponse): x is NextResponse {
  return x instanceof NextResponse
}
