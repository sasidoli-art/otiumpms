import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET  /api/host/strutture/[id]/tariffe?unitaId=xxx
export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const unitaId = searchParams.get('unitaId')

  const unitaIds = unitaId
    ? [unitaId]
    : (await prisma.unitaPrenotabile.findMany({ where: { strutturaId: params.id }, select: { id: true } })).map((u) => u.id)

  const tariffe = await prisma.tariffaPeriodo.findMany({
    where: { unitaId: { in: unitaIds } },
    include: { unita: { select: { nome: true } } },
    orderBy: { dataInizio: 'asc' },
  })

  return NextResponse.json(tariffe)
}

// POST /api/host/strutture/[id]/tariffe
export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const { unitaId, nome, dataInizio, dataFine, prezzo, colore } = body

  if (!unitaId || !nome || !dataInizio || !dataFine || prezzo == null) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const unita = await prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id } })
  if (!unita) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })

  const tariffa = await prisma.tariffaPeriodo.create({
    data: {
      unitaId,
      nome,
      dataInizio: new Date(dataInizio),
      dataFine: new Date(dataFine),
      prezzo: Number(prezzo),
      colore: colore || '#6366f1',
    },
  })

  return NextResponse.json(tariffa, { status: 201 })
}

// DELETE /api/host/strutture/[id]/tariffe?tariffaId=xxx
export async function DELETE(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const tariffaId = searchParams.get('tariffaId')
  if (!tariffaId) return NextResponse.json({ error: 'tariffaId mancante' }, { status: 400 })

  const tariffa = await prisma.tariffaPeriodo.findFirst({
    where: { id: tariffaId },
    include: { unita: { select: { strutturaId: true } } },
  })
  if (!tariffa || tariffa.unita.strutturaId !== params.id) {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  }

  await prisma.tariffaPeriodo.delete({ where: { id: tariffaId } })
  return new NextResponse(null, { status: 204 })
}

// PUT /api/host/strutture/[id]/tariffe?tariffaId=xxx
export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const tariffaId = searchParams.get('tariffaId')
  if (!tariffaId) return NextResponse.json({ error: 'tariffaId mancante' }, { status: 400 })

  const tariffa = await prisma.tariffaPeriodo.findFirst({
    where: { id: tariffaId },
    include: { unita: { select: { strutturaId: true } } },
  })
  if (!tariffa || tariffa.unita.strutturaId !== params.id) {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  }

  const body = await req.json()
  const { unitaId, nome, dataInizio, dataFine, prezzo, colore } = body

  if (!unitaId || !nome || !dataInizio || !dataFine || prezzo == null) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  // Verify the new unitaId belongs to this struttura
  const nuovaUnita = await prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id } })
  if (!nuovaUnita) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })

  const aggiornata = await prisma.tariffaPeriodo.update({
    where: { id: tariffaId },
    data: {
      unitaId,
      nome,
      dataInizio: new Date(dataInizio),
      dataFine: new Date(dataFine),
      prezzo: Number(prezzo),
      colore: colore || '#6366f1',
    },
  })

  return NextResponse.json(aggiornata)
}
