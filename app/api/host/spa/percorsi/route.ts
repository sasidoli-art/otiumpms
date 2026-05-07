import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const percorsi = await prisma.percorsoBenessere.findMany({
    where: { hostId: auth.user.hostId },
    include: {
      passaggi: {
        include: { trattamento: { select: { id: true, nome: true, durata: true, colore: true } } },
        orderBy: { ordine: 'asc' },
      },
    },
    orderBy: { nome: 'asc' },
  })
  return NextResponse.json(percorsi)
}

export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { nome, descrizione, prezzo, colore, passaggi } = body
  // passaggi: [{ trattamentoId, ordine, durata, note }]

  if (!nome || prezzo == null) {
    return NextResponse.json({ error: 'Nome e prezzo obbligatori' }, { status: 400 })
  }

  const durataCalcolata = Array.isArray(passaggi)
    ? passaggi.reduce((s: number, p: { durata: number }) => s + (Number(p.durata) || 0), 0)
    : 0

  const percorso = await prisma.percorsoBenessere.create({
    data: {
      hostId: auth.user.hostId,
      nome,
      descrizione: descrizione || null,
      prezzo: Number(prezzo),
      durataMinuti: durataCalcolata,
      colore: colore || '#f59e0b',
      passaggi: Array.isArray(passaggi)
        ? {
            create: passaggi.map((p: { trattamentoId: string; ordine: number; durata: number; note?: string }) => ({
              trattamentoId: p.trattamentoId,
              ordine: Number(p.ordine) || 0,
              durata: Number(p.durata) || 60,
              note: p.note || null,
            })),
          }
        : undefined,
    },
    include: {
      passaggi: {
        include: { trattamento: { select: { id: true, nome: true, durata: true, colore: true } } },
        orderBy: { ordine: 'asc' },
      },
    },
  })
  return NextResponse.json(percorso, { status: 201 })
}
