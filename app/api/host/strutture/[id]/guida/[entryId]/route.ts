import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

type RouteParams = Promise<{ id: string; entryId: string }>

async function loadEntry(id: string, entryId: string, hostId: string) {
  const struttura = await prisma.struttura.findFirst({ where: { id, hostId } })
  if (!struttura) return { error: NextResponse.json({ error: 'Non trovato' }, { status: 404 }) }
  const entry = await prisma.guidaStruttura.findFirst({
    where: { id: entryId, strutturaId: id },
  })
  if (!entry) return { error: NextResponse.json({ error: 'Voce guida non trovata' }, { status: 404 }) }
  return { entry }
}

// GET /api/host/strutture/[id]/guida/[entryId]
export async function GET(_: NextRequest, { params }: { params: RouteParams }) {
  const { id, entryId } = await params
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const r = await loadEntry(id, entryId, auth.user.hostId)
  if (r.error) return r.error
  return NextResponse.json(r.entry)
}

// PATCH /api/host/strutture/[id]/guida/[entryId]
export async function PATCH(req: NextRequest, { params }: { params: RouteParams }) {
  const { id, entryId } = await params
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const r = await loadEntry(id, entryId, auth.user.hostId)
  if (r.error) return r.error

  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  const allow = [
    'titolo', 'descrizione', 'icona', 'ordine',
    'fotoUrl', 'indirizzo', 'distanzaKm', 'mapsLink',
    'telefono', 'orari', 'websiteUrl', 'traduzioni', 'attivo',
  ]
  for (const k of allow) {
    if (k in body) {
      if (k === 'distanzaKm') data[k] = body[k] === null ? null : Number(body[k])
      else if (k === 'ordine') data[k] = Number(body[k])
      else data[k] = body[k]
    }
  }

  if (data.titolo !== undefined && !String(data.titolo).trim()) {
    return NextResponse.json({ error: 'Titolo non può essere vuoto' }, { status: 400 })
  }

  const updated = await prisma.guidaStruttura.update({
    where: { id: entryId },
    data,
  })
  return NextResponse.json(updated)
}

// DELETE /api/host/strutture/[id]/guida/[entryId]
export async function DELETE(_: NextRequest, { params }: { params: RouteParams }) {
  const { id, entryId } = await params
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const r = await loadEntry(id, entryId, auth.user.hostId)
  if (r.error) return r.error

  await prisma.guidaStruttura.delete({ where: { id: entryId } })
  return NextResponse.json({ ok: true })
}
