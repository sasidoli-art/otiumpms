import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/host/housekeeping?strutturaId=xxx
// Ritorna tutte le unità della struttura con stato HK e task aperti
export async function GET(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const strutturaId = searchParams.get('strutturaId')

  const where = strutturaId
    ? { strutturaId, struttura: { hostId: auth.user.hostId } }
    : { struttura: { hostId: auth.user.hostId } }

  const unita = await prisma.unitaPrenotabile.findMany({
    where,
    include: {
      struttura: { select: { id: true, nome: true } },
      taskHK: {
        where: { completato: false },
        orderBy: [{ priorita: 'desc' }, { createdAt: 'asc' }],
      },
      prenotazioni: {
        where: {
          stato: { in: ['CONFERMATA', 'COMPLETATA'] },
          dataPartenza: { gte: new Date() },
        },
        orderBy: { dataArrivo: 'asc' },
        take: 1,
        select: {
          id: true,
          guestNome: true,
          guestCognome: true,
          dataArrivo: true,
          dataPartenza: true,
          stato: true,
        },
      },
    },
    orderBy: [{ strutturaId: 'asc' }, { nome: 'asc' }],
  })

  return NextResponse.json(unita)
}
