import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const createStrutturaSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(['EVENTO', 'VENUE', 'ESPERIENZA', 'ALLOGGIO', 'SERVIZIO']).optional(),
  descrizione: z.string().optional(),
  indirizzo: z.string().optional(),
  citta: z.string().optional(),
  regione: z.string().optional(),
  capacitaTotale: z.union([z.number(), z.string()]).optional(),
  prezzoBase: z.union([z.number(), z.string()]).optional(),
})

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

  const raw = await req.json()
  const parsed = createStrutturaSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const { nome, tipo, descrizione, indirizzo, citta, regione, capacitaTotale, prezzoBase } = parsed.data

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
