import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'

const STATI_ESCLUSI = ['ANNULLATA', 'NO_SHOW'] as const

// GET /api/host/strutture/[id]/pannello?mese=2026-06
export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const meseParam = searchParams.get('mese') ?? format(new Date(), 'yyyy-MM')

  const [anno, meseNum] = meseParam.split('-').map(Number)
  const inizio = new Date(anno, meseNum - 1, 1)
  const fine = new Date(anno, meseNum, 0)

  const unita = await prisma.unitaPrenotabile.findMany({
    where: { strutturaId: params.id, attiva: true },
    include: {
      tariffe: {
        where: {
          dataInizio: { lte: fine },
          dataFine: { gte: inizio },
        },
        orderBy: { dataInizio: 'asc' },
      },
      disponibilita: {
        where: { data: { gte: inizio, lte: fine } },
        orderBy: { data: 'asc' },
      },
      prenotazioni: {
        where: {
          stato: { notIn: [...STATI_ESCLUSI] },
          dataArrivo: { lte: fine },
          OR: [
            { dataPartenza: { gte: inizio } },
            { dataPartenza: null },
          ],
        },
        select: {
          dataArrivo: true,
          dataPartenza: true,
          stato: true,
          guestNome: true,
          guestCognome: true,
        },
      },
    },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json({ mese: meseParam, unita })
}
