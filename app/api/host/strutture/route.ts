import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/host/strutture
export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const strutture = await prisma.struttura.findMany({
    where: { hostId: auth.user.hostId },
    include: {
      unita: { where: { attiva: true }, select: { id: true, nome: true, prezzoBase: true } },
      _count: { select: { prenotazioni: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(strutture)
}

// POST /api/host/strutture
export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const body = await req.json()
  const { nome, tipo, descrizione, indirizzo, citta, regione, capacitaTotale, prezzoBase } = body

  if (!nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const struttura = await prisma.struttura.create({
    data: {
      hostId: auth.user.hostId,
      nome,
      tipo: tipo || 'EVENTO',
      descrizione,
      indirizzo,
      citta,
      regione,
      capacitaTotale: capacitaTotale ? Number(capacitaTotale) : 1,
      prezzoBase: prezzoBase ? Number(prezzoBase) : 0,
    },
  })

  return NextResponse.json(struttura, { status: 201 })
}
