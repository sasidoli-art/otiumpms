import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

// GET /api/superadmin/tickets?stato=&priorita=&categoria=&hostId=&q=&dal=&al=&page=&limit=
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const priorita = searchParams.get('priorita')
  const categoria = searchParams.get('categoria')
  const hostId = searchParams.get('hostId')
  const q = searchParams.get('q')
  const dal = searchParams.get('dal')
  const al = searchParams.get('al')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25')))

  const where: Record<string, unknown> = {}
  if (stato) where.stato = stato
  if (priorita) where.priorita = priorita
  if (categoria) where.categoria = categoria
  if (hostId) where.hostId = hostId
  if (dal || al) {
    const r: Record<string, Date> = {}
    if (dal) r.gte = new Date(dal)
    if (al) r.lte = new Date(al)
    where.createdAt = r
  }
  if (q) {
    where.OR = [
      { oggetto: { contains: q, mode: 'insensitive' } },
      { descrizione: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [tickets, total, kpi] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        user: { select: { id: true, nome: true, cognome: true, email: true, role: true } },
        host: { select: { id: true, nomeAzienda: true } },
      },
      orderBy: [
        { priorita: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ticket.count({ where }),
    prisma.ticket.groupBy({
      by: ['stato'],
      _count: true,
    }),
  ])

  const kpiMap = kpi.reduce<Record<string, number>>((acc, k) => {
    acc[k.stato] = k._count
    return acc
  }, {})

  return NextResponse.json({
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    kpi: {
      totale: total,
      aperti: kpiMap.APERTO ?? 0,
      inLavorazione: kpiMap.IN_LAVORAZIONE ?? 0,
      risolti: kpiMap.RISOLTO ?? 0,
      chiusi: kpiMap.CHIUSO ?? 0,
    },
  })
}
