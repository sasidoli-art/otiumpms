import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const cabine = await prisma.cabinaSpa.findMany({
    where: { hostId: auth.user.hostId },
    orderBy: { nome: 'asc' },
  })
  return NextResponse.json(cabine)
}

export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { nome, descrizione, colore, capacita } = body

  if (!nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const cabina = await prisma.cabinaSpa.create({
    data: {
      hostId: auth.user.hostId,
      nome,
      descrizione: descrizione || null,
      colore: colore || '#8b5cf6',
      capacita: Number(capacita) || 1,
    },
  })
  return NextResponse.json(cabina, { status: 201 })
}
