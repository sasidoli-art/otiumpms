import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

// GET /api/admin/ticket — lista tutti i ticket (admin only)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const url = new URL(req.url)
  const stato = url.searchParams.get('stato')
  const categoria = url.searchParams.get('categoria')

  const where: Record<string, unknown> = {}
  if (stato) where.stato = stato
  if (categoria) where.categoria = categoria

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      user: { select: { nome: true, cognome: true, email: true, role: true } },
      host: { select: { nomeAzienda: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const counts = await prisma.ticket.groupBy({
    by: ['stato'],
    _count: true,
  })

  return NextResponse.json({ tickets, counts })
}
