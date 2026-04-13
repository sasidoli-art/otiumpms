import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'

/**
 * GET /api/host/wifi/sessions?days=30
 * Ultimo log sessioni Wi-Fi dell'host.
 * Pisanu compliance: log conservati 6 mesi.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const url = new URL(req.url)
  const days = Math.min(Number(url.searchParams.get('days') ?? '30'), 180)
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sessions = await prisma.wifiSession.findMany({
    where: {
      hostId: auth.user.hostId,
      startAt: { gte: since },
    },
    include: {
      accessCode: { select: { codice: true } },
    },
    orderBy: { startAt: 'desc' },
    take: 500,
  })

  return NextResponse.json({ sessions })
}
