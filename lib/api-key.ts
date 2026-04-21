import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * API Key system per integrazioni 3rd-party.
 *
 * Formato token: `otk_<prefix>_<secret>` (otk = "otium key")
 *   - prefix: 8 char base62, mostrato in UI ("otk_a3b8c2f1_...")
 *   - secret: 32 byte random, hex = 64 char
 *
 * Storage DB: SHA-256 del token completo in `ApiKey.token`
 *   → confronto timing-safe, non reversibile.
 *
 * Alla creazione mostriamo il token UNA VOLTA; poi solo prefix.
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomPrefix(): string {
  const buf = crypto.randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) out += ALPHABET[buf[i] % ALPHABET.length]
  return out
}

function randomSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

/**
 * Genera una nuova chiave. Ritorna il token completo (solo in memoria)
 * e i metadati del record salvato.
 */
export async function createApiKey(params: {
  hostId: string
  nome: string
  scopes?: string[]
  scadenza?: Date | null
}): Promise<{ token: string; prefix: string; id: string }> {
  const prefix = randomPrefix()
  const secret = randomSecret()
  const token = `otk_${prefix}_${secret}`

  const record = await prisma.apiKey.create({
    data: {
      hostId: params.hostId,
      nome: params.nome,
      token: hashToken(token),
      prefix,
      scopes: params.scopes ?? [],
      scadenza: params.scadenza ?? null,
    },
  })

  return { token, prefix, id: record.id }
}

/**
 * Verifica un token e ritorna il record ApiKey se valido.
 * null se invalido/scaduto/revocato.
 */
export async function verifyApiKey(token: string): Promise<
  { id: string; hostId: string; scopes: string[]; nome: string } | null
> {
  if (!token?.startsWith('otk_')) return null
  const hashed = hashToken(token)

  const key = await prisma.apiKey.findUnique({
    where: { token: hashed },
    select: { id: true, hostId: true, scopes: true, nome: true, revocata: true, scadenza: true },
  })
  if (!key) return null
  if (key.revocata) return null
  if (key.scadenza && key.scadenza.getTime() < Date.now()) return null

  // Touch ultimaUsata (fire-and-forget)
  prisma.apiKey.update({
    where: { id: key.id },
    data: { ultimaUsata: new Date() },
  }).catch(() => { /* non bloccante */ })

  return { id: key.id, hostId: key.hostId, scopes: key.scopes, nome: key.nome }
}

/**
 * Guard per route API v1: legge X-API-Key o Authorization: Bearer.
 * Ritorna record valido o NextResponse 401.
 */
export async function requireApiKey(
  req: NextRequest,
  requiredScope?: string,
): Promise<{ id: string; hostId: string; scopes: string[]; nome: string } | NextResponse> {
  const header = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!header) {
    return NextResponse.json(
      { error: 'Missing API key. Use header X-API-Key or Authorization: Bearer <token>.' },
      { status: 401 },
    )
  }

  const key = await verifyApiKey(header)
  if (!key) {
    return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
  }

  if (requiredScope && !key.scopes.includes(requiredScope) && !key.scopes.includes('*')) {
    return NextResponse.json(
      { error: `Missing scope: ${requiredScope}. Available: ${key.scopes.join(', ')}` },
      { status: 403 },
    )
  }

  return key
}

export function isApiKeyUnauthorized(
  x: { id: string; hostId: string } | NextResponse,
): x is NextResponse {
  return x instanceof NextResponse
}
