import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const terapisti = await prisma.terapistaSpa.findMany({
    where: { hostId: auth.user.hostId },
    orderBy: { nome: 'asc' },
  })
  return NextResponse.json(terapisti)
}

export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { nome, cognome, email, telefono, colore, specializzazioni, note } = body

  if (!nome || !cognome) {
    return NextResponse.json({ error: 'Nome e cognome obbligatori' }, { status: 400 })
  }

  const terapista = await prisma.terapistaSpa.create({
    data: {
      hostId: auth.user.hostId,
      nome,
      cognome,
      email: email || null,
      telefono: telefono || null,
      colore: colore || '#6366f1',
      specializzazioni: specializzazioni || [],
      note: note || null,
    },
  })
  return NextResponse.json(terapista, { status: 201 })
}
