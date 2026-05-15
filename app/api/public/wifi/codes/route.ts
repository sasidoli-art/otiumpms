import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiApiKey, isAuthError } from '@/lib/wifi/public-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/wifi/codes
 * Scope: codes:read
 * Query: ?active=true|false (default true), ?limit=50 (max 200)
 *
 * Returns: { codes: [{ id, codice, durataMinuti, usiMax, usiEffettuati, validoFino, note, createdAt }] }
 */
export async function GET(req: NextRequest) {
  const auth = await requireWifiApiKey(req, 'codes:read')
  if (isAuthError(auth)) return auth

  const sp = req.nextUrl.searchParams
  const onlyActive = sp.get('active') !== 'false'
  const limit = Math.min(200, Math.max(1, Number(sp.get('limit') ?? 50)))

  const where: { hostId: string; revocatoAt?: null; validoFino?: { gte: Date } } = {
    hostId: auth.hostId,
  }
  if (onlyActive) {
    where.revocatoAt = null
    where.validoFino = { gte: new Date() }
  }

  const codes = await prisma.wifiAccessCode.findMany({
    where,
    select: {
      id: true, codice: true, durataMinuti: true,
      usiMax: true, usiEffettuati: true, validoFino: true,
      note: true, createdAt: true, revocatoAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ codes })
}

/**
 * POST /api/public/wifi/codes
 * Scope: codes:write
 *
 * Body: {
 *   durataMinuti: number,
 *   usiMax?: number,         (-1 = illimitati, default 1)
 *   validGiorni?: number,    (1-365, default 1)
 *   note?: string,
 *   codiceCustom?: string,
 *   count?: number,          (default 1, max 100)
 *   prefix?: string,
 * }
 *
 * Returns: { codes: [...] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireWifiApiKey(req, 'codes:write')
  if (isAuthError(auth)) return auth

  const body = await req.json().catch(() => ({}))
  const durataMinuti = Number(body.durataMinuti)
  const usiMax = body.usiMax === undefined ? 1 : Number(body.usiMax)
  const validGiorni = Number(body.validGiorni ?? 1)
  const note = typeof body.note === 'string' ? body.note : null
  const count = Math.max(1, Math.min(100, Number(body.count ?? 1)))
  const codiceCustom = typeof body.codiceCustom === 'string' ? body.codiceCustom.trim().toUpperCase() : ''
  const prefix = typeof body.prefix === 'string' ? body.prefix.trim().toUpperCase() : ''

  if (!Number.isFinite(durataMinuti) || durataMinuti <= 0) {
    return NextResponse.json({ error: 'durataMinuti required (>0)' }, { status: 400 })
  }
  if (!Number.isFinite(validGiorni) || validGiorni <= 0 || validGiorni > 365) {
    return NextResponse.json({ error: 'validGiorni out of range (1-365)' }, { status: 400 })
  }
  if (codiceCustom && count > 1) {
    return NextResponse.json({ error: 'codiceCustom only with count=1' }, { status: 400 })
  }
  if (codiceCustom && !/^[A-Z0-9-]{3,32}$/.test(codiceCustom)) {
    return NextResponse.json({ error: 'codiceCustom must be 3-32 chars A-Z 0-9 -' }, { status: 400 })
  }
  if (prefix && !/^[A-Z0-9-]{1,16}$/.test(prefix)) {
    return NextResponse.json({ error: 'prefix max 16 chars A-Z 0-9 -' }, { status: 400 })
  }

  const validoFino = new Date(); validoFino.setDate(validoFino.getDate() + validGiorni)

  const created = []
  for (let i = 0; i < count; i++) {
    const codice = codiceCustom || (prefix + generateRandomCode(prefix ? 6 : 8))
    try {
      const c = await prisma.wifiAccessCode.create({
        data: {
          hostId: auth.hostId,
          codice,
          durataMinuti, usiMax, validoFino, note,
        },
      })
      created.push(c)
    } catch (err) {
      // Collision on unique → retry random once
      if (codiceCustom) {
        return NextResponse.json({ error: `Code "${codiceCustom}" already exists` }, { status: 409 })
      }
      try {
        const retry = prefix + generateRandomCode(prefix ? 6 : 8)
        const c = await prisma.wifiAccessCode.create({
          data: { hostId: auth.hostId, codice: retry, durataMinuti, usiMax, validoFino, note },
        })
        created.push(c)
      } catch {
        // skip — log only
        console.error('Failed to create code after retry', err)
      }
    }
  }

  return NextResponse.json({ codes: created }, { status: 201 })
}

function generateRandomCode(len: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}
