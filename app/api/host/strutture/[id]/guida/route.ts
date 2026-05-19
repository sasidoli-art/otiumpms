import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { CategoriaGuida } from '@prisma/client'

const VALID_CATEGORIE = Object.values(CategoriaGuida)

// GET /api/host/strutture/[id]/guida — lista entry guida (opzionale ?categoria=)
export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const categoria = req.nextUrl.searchParams.get('categoria') as CategoriaGuida | null
  const where: { strutturaId: string; categoria?: CategoriaGuida } = { strutturaId: params.id }
  if (categoria && VALID_CATEGORIE.includes(categoria)) where.categoria = categoria

  const entries = await prisma.guidaStruttura.findMany({
    where,
    orderBy: [{ categoria: 'asc' }, { ordine: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(entries)
}

// POST /api/host/strutture/[id]/guida — crea nuova entry
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  if (!body.titolo?.trim()) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })
  if (!VALID_CATEGORIE.includes(body.categoria)) {
    return NextResponse.json({ error: 'Categoria non valida' }, { status: 400 })
  }

  // Calcola ordine successivo per la categoria
  const maxOrdine = await prisma.guidaStruttura.aggregate({
    where: { strutturaId: params.id, categoria: body.categoria },
    _max: { ordine: true },
  })

  const entry = await prisma.guidaStruttura.create({
    data: {
      strutturaId: params.id,
      categoria: body.categoria,
      titolo: body.titolo.trim(),
      descrizione: body.descrizione?.trim() || null,
      icona: body.icona || null,
      ordine: (maxOrdine._max.ordine ?? -1) + 1,
      fotoUrl: body.fotoUrl || null,
      indirizzo: body.indirizzo || null,
      distanzaKm: body.distanzaKm ? Number(body.distanzaKm) : null,
      mapsLink: body.mapsLink || null,
      telefono: body.telefono || null,
      orari: body.orari || null,
      websiteUrl: body.websiteUrl || null,
      traduzioni: body.traduzioni || undefined,
      attivo: body.attivo ?? true,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
