import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const trattamenti = await prisma.trattamentoSpa.findMany({
    where: { hostId: auth.user.hostId },
    orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
  })
  return NextResponse.json(trattamenti)
}

export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { nome, categoria, durata, prezzo, descrizione, colore } = body

  if (!nome || !durata || prezzo == null) {
    return NextResponse.json({ error: 'Nome, durata e prezzo obbligatori' }, { status: 400 })
  }

  const trattamento = await prisma.trattamentoSpa.create({
    data: {
      hostId: auth.user.hostId,
      nome,
      categoria: categoria || 'MASSAGGIO',
      durata: Number(durata),
      prezzo: Number(prezzo),
      descrizione: descrizione || null,
      colore: colore || '#06b6d4',
    },
  })
  return NextResponse.json(trattamento, { status: 201 })
}
