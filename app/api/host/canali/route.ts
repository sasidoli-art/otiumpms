import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { generateIcalToken } from '@/lib/ical'

/**
 * Costruisce l'URL di export del feed per una coppia (unitaId, canaleId).
 * `?escludiCanale` evita i loop quando il canale stesso reimporta la sua copia.
 */
function buildFeedUrl(req: NextRequest, unitaId: string, canaleId: string): string {
  const token = generateIcalToken(unitaId)
  const origin = req.headers.get('x-forwarded-host')
    ? `https://${req.headers.get('x-forwarded-host')}`
    : req.nextUrl.origin
  return `${origin}/api/ical/${unitaId}?token=${token}&escludiCanale=${canaleId}`
}

/** GET /api/host/canali — lista canali esterni per l'host */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const canali = await prisma.canaleEsterno.findMany({
    where: { struttura: { hostId: auth.user.hostId } },
    include: {
      struttura: { select: { nome: true } },
      unita: { select: { id: true, nome: true } },
      _count: { select: { prenotazioniImportate: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const canaliConFeed = canali.map((c) => ({
    ...c,
    feedUrl: c.unita ? buildFeedUrl(req, c.unita.id, c.id) : null,
  }))

  return NextResponse.json(canaliConFeed)
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
