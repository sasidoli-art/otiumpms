import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/** GET /api/host/canali — lista canali esterni per l'host */
export async function GET(_: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const canali = await prisma.canaleEsterno.findMany({
    where: { struttura: { hostId: auth.user.hostId } },
    include: {
      struttura: { select: { nome: true } },
      unita: { select: { nome: true } },
      _count: { select: { prenotazioniImportate: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(canali)
}

/** POST /api/host/canali — aggiungi nuovo canale */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { strutturaId, unitaId, nome, urlIcal, colore } = body

  if (!strutturaId || !nome || !urlIcal) {
    return NextResponse.json({ error: 'strutturaId, nome e urlIcal obbligatori' }, { status: 400 })
  }

  // Verifica ownership struttura
  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const canale = await prisma.canaleEsterno.create({
    data: {
      strutturaId,
      unitaId: unitaId || null,
      nome,
      urlIcal,
      colore: colore || '#f59e0b',
    },
    include: { struttura: { select: { nome: true } }, unita: { select: { nome: true } } },
  })

  return NextResponse.json(canale, { status: 201 })
}
