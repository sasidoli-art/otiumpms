import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { generateApiKey, hashApiKey, ALL_SCOPES, type WifiApiScope } from '@/lib/wifi/public-auth'

/**
 * GET /api/superadmin/wifi/api-keys
 * Lista tutte le API key Wi-Fi con info host.
 */
export async function GET() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const keys = await prisma.wifiApiKey.findMany({
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimitPerMin: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      note: true,
      createdAt: true,
      host: { select: { id: true, nomeAzienda: true } },
    },
    orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ keys })
}

/**
 * POST /api/superadmin/wifi/api-keys
 * Body: { hostId, name, scopes, rateLimitPerMin?, expiresAt?, note? }
 * Returns: { key: { ...meta }, plainKey: string }  ← plainKey mostrata 1 volta sola
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json().catch(() => ({}))
  const hostId = String(body.hostId ?? '').trim()
  const name = String(body.name ?? '').trim()
  const scopes = Array.isArray(body.scopes) ? body.scopes.filter((s: unknown) => ALL_SCOPES.includes(s as WifiApiScope)) as WifiApiScope[] : []
  const rateLimitPerMin = Math.max(1, Math.min(1000, Number(body.rateLimitPerMin ?? 60)))
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
  const note = typeof body.note === 'string' ? body.note : null

  if (!hostId || !name) {
    return NextResponse.json({ error: 'hostId, name required' }, { status: 400 })
  }
  if (scopes.length === 0) {
    return NextResponse.json({ error: 'At least 1 valid scope required', validScopes: ALL_SCOPES }, { status: 400 })
  }

  const host = await prisma.host.findUnique({ where: { id: hostId }, select: { id: true } })
  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 })

  const { plain, prefix } = generateApiKey()
  const keyHash = hashApiKey(plain)

  const userId = 'user' in auth ? auth.user?.id ?? null : null

  const key = await prisma.wifiApiKey.create({
    data: {
      hostId,
      name,
      keyHash,
      keyPrefix: prefix,
      scopes,
      rateLimitPerMin,
      expiresAt,
      note,
      createdByUserId: userId,
    },
    select: {
      id: true, name: true, keyPrefix: true, scopes: true,
      rateLimitPerMin: true, expiresAt: true, note: true, createdAt: true,
      host: { select: { id: true, nomeAzienda: true } },
    },
  })

  return NextResponse.json({ key, plainKey: plain }, { status: 201 })
}
