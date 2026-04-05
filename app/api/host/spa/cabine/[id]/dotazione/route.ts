import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/spa/cabine/[id]/dotazione
 * Lista articoli dotazione per una cabina SPA.
 */
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const cabina = await prisma.cabinaSpa.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true, nome: true },
  })
  if (!cabina) return NextResponse.json({ error: 'Cabina non trovata' }, { status: 404 })

  const dotazione = await prisma.dotazioneCabinaSpa.findMany({
    where: { cabinaId: id },
    orderBy: [{ categoria: 'asc' }, { articolo: 'asc' }],
  })

  return NextResponse.json({ cabina, dotazione })
}

/**
 * POST /api/host/spa/cabine/[id]/dotazione
 * Aggiungi articolo alla dotazione della cabina.
 * Body: { articolo: string, quantita: number, categoria?: string }
 */
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const cabina = await prisma.cabinaSpa.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!cabina) return NextResponse.json({ error: 'Cabina non trovata' }, { status: 404 })

  const body = await req.json()
  const { articolo, quantita, categoria } = body

  if (!articolo) return NextResponse.json({ error: 'Articolo obbligatorio' }, { status: 400 })

  const item = await prisma.dotazioneCabinaSpa.create({
    data: {
      cabinaId: id,
      articolo,
      quantita: quantita ?? 1,
      categoria: categoria || 'BIANCHERIA',
    },
  })

  return NextResponse.json(item, { status: 201 })
}

/**
 * DELETE /api/host/spa/cabine/[id]/dotazione?itemId=xxx
 * Rimuovi articolo dalla dotazione.
 */
export async function DELETE(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const itemId = req.nextUrl.searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId obbligatorio' }, { status: 400 })

  const item = await prisma.dotazioneCabinaSpa.findFirst({
    where: { id: itemId, cabina: { id, hostId: auth.user.hostId } },
  })
  if (!item) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.dotazioneCabinaSpa.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
