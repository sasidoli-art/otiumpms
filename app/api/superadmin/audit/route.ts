import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/**
 * GET /api/superadmin/audit
 * Log completo di TUTTI gli host — solo SUPERADMIN.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 200)
  const offset = parseInt(sp.get('offset') ?? '0')
  const entita = sp.get('entita')
  const azione = sp.get('azione')
  const hostId = sp.get('hostId')
  const da = sp.get('da')
  const a = sp.get('a')

  const where = {
    ...(hostId ? { hostId } : {}),
    ...(entita ? { entita: { contains: entita, mode: 'insensitive' as const } } : {}),
    ...(azione ? { azione: { contains: azione, mode: 'insensitive' as const } } : {}),
    ...(da || a ? {
      createdAt: {
        ...(da ? { gte: new Date(da) } : {}),
        ...(a ? { lte: new Date(a) } : {}),
      },
    } : {}),
  }

  const [logs, totale, hosts] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
    prisma.host.findMany({ select: { id: true, nomeAzienda: true }, orderBy: { nomeAzienda: 'asc' } }),
  ])

  return NextResponse.json({ logs, totale, limit, offset, hosts })
}
