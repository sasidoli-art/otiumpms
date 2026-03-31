import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET  /api/host/strutture/[id]/disponibilita?mese=2024-06&unitaId=xxx
export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const mese = searchParams.get('mese')         // es. "2024-06"
  const unitaId = searchParams.get('unitaId')

  const unitaDellaStruttura = await prisma.unitaPrenotabile.findMany({
    where: { strutturaId: params.id },
    select: { id: true },
  })
  const unitaIds = unitaDellaStruttura.map((u) => u.id)

  const where: Record<string, unknown> = {
    unitaId: unitaId ? unitaId : { in: unitaIds },
  }

  if (mese) {
    const [anno, meseNum] = mese.split('-').map(Number)
    const inizio = new Date(anno, meseNum - 1, 1)
    const fine = new Date(anno, meseNum, 0)
    where.data = { gte: inizio, lte: fine }
  }

  const disponibilita = await prisma.disponibilita.findMany({
    where,
    include: { unita: { select: { nome: true } } },
    orderBy: { data: 'asc' },
  })

  return NextResponse.json(disponibilita)
}

// POST /api/host/strutture/[id]/disponibilita  — bulk upsert
// body: { unitaId, aggiornamenti: [{data, postiDisponibili, chiuso, noteInterno}] }
export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const { unitaId, aggiornamenti } = body as {
    unitaId: string
    aggiornamenti: { data: string; postiDisponibili: number; chiuso: boolean; noteInterno?: string }[]
  }

  if (!unitaId || !Array.isArray(aggiornamenti)) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }

  // Verifica che l'unità appartenga alla struttura
  const unita = await prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id } })
  if (!unita) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })

  const risultati = await prisma.$transaction(
    aggiornamenti.map((a) =>
      prisma.disponibilita.upsert({
        where: { unitaId_data: { unitaId, data: new Date(a.data) } },
        create: {
          unitaId,
          data: new Date(a.data),
          postiDisponibili: a.postiDisponibili,
          chiuso: a.chiuso,
          noteInterno: a.noteInterno,
        },
        update: {
          postiDisponibili: a.postiDisponibili,
          chiuso: a.chiuso,
          noteInterno: a.noteInterno,
        },
      }),
    ),
  )

  return NextResponse.json({ aggiornati: risultati.length })
}
