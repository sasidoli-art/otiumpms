import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET  /api/host/strutture/[id]/unita
export async function GET(_: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const unita = await prisma.unitaPrenotabile.findMany({
    where: { strutturaId: params.id },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(unita)
}

// POST /api/host/strutture/[id]/unita
export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  if (!body.nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const unita = await prisma.unitaPrenotabile.create({
    data: {
      strutturaId: params.id,
      nome: body.nome,
      descrizione: body.descrizione,
      capacita: body.capacita ? Number(body.capacita) : 1,
      prezzoBase: body.prezzoBase ? Number(body.prezzoBase) : 0,
      immagine: body.immagine || null,
    },
  })

  return NextResponse.json(unita, { status: 201 })
}
