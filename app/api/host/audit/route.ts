import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/audit?limit=50&offset=0&entita=prenotazione&azione=confermata
 * Consulta il registro attività (audit log).
 */
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 200)
  const offset = parseInt(sp.get('offset') ?? '0')
  const entita = sp.get('entita')
  const azione = sp.get('azione')
  const da = sp.get('da')
  const a = sp.get('a')

  const where = {
    hostId: auth.user.hostId,
    ...(entita ? { entita: { contains: entita, mode: 'insensitive' as const } } : {}),
    ...(azione ? { azione: { contains: azione, mode: 'insensitive' as const } } : {}),
    ...(da || a ? {
      createdAt: {
        ...(da ? { gte: new Date(da) } : {}),
        ...(a ? { lte: new Date(a) } : {}),
      },
    } : {}),
  }

  const [logs, totale] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ logs, totale, limit, offset })
}
