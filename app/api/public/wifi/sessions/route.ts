import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiApiKey, isAuthError } from '@/lib/wifi/public-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/wifi/sessions
 * Scope: sessions:read
 *
 * Query:
 *   - active=true|false (default false = all)
 *   - since=<ISO> (only sessions startAt >= since)
 *   - until=<ISO>
 *   - limit (default 100, max 500)
 *   - cursor (paginazione, vedi Link header)
 *
 * Returns: { sessions: [...], nextCursor: string | null }
 */
export async function GET(req: NextRequest) {
  const auth = await requireWifiApiKey(req, 'sessions:read')
  if (isAuthError(auth)) return auth

  const sp = req.nextUrl.searchParams
  const onlyActive = sp.get('active') === 'true'
  const since = sp.get('since')
  const until = sp.get('until')
  const limit = Math.min(500, Math.max(1, Number(sp.get('limit') ?? 100)))
  const cursor = sp.get('cursor') ?? undefined

  const where: {
    hostId: string
    startAt?: { gte?: Date; lte?: Date }
    expiresAt?: { gt: Date }
    revokedAt?: null
  } = { hostId: auth.hostId }

  if (since || until) {
    where.startAt = {}
    if (since) where.startAt.gte = new Date(since)
    if (until) where.startAt.lte = new Date(until)
  }

  if (onlyActive) {
    where.expiresAt = { gt: new Date() }
    where.revokedAt = null
  }

  const sessions = await prisma.wifiSession.findMany({
    where,
    select: {
      id: true,
      tipo: true,
      guestNome: true,
      guestCognome: true,
      numeroCamera: true,
      macClient: true,
      ipClient: true,
      userAgent: true,
      startAt: true,
      expiresAt: true,
      revokedAt: true,
      accessCodeId: true,
      prenotazioneId: true,
    },
    orderBy: { startAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = sessions.length > limit
  const items = hasMore ? sessions.slice(0, limit) : sessions
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({
    sessions: items,
    nextCursor,
  })
}
