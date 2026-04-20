import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { isStatoPrenotazione } from '@/lib/validations'

// GET /api/admin/prenotazioni
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const q = searchParams.get('q')
  const hostId = searchParams.get('hostId')

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      deletedAt: null,
      ...(stato && isStatoPrenotazione(stato) ? { stato } : {}),
      ...(hostId ? { hostId } : {}),
      ...(q
        ? {
            OR: [
              { guestNome: { contains: q, mode: 'insensitive' } },
              { guestCognome: { contains: q, mode: 'insensitive' } },
              { guestEmail: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      host: { select: { nomeAzienda: true } },
      struttura: { select: { nome: true } },
      chat: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(prenotazioni)
}
