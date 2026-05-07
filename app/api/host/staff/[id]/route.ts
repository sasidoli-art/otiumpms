import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// PATCH /api/host/staff/[id]
export async function PATCH(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth
  const params = await paramsPromise

  const com = await prisma.comunicazioneStaff.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!com) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  const fields = ['tipo', 'titolo', 'testo', 'autore', 'destinatari', 'fissato', 'archiviato', 'letti']
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f]
  }
  if (body.dataScadenza !== undefined) data.dataScadenza = body.dataScadenza ? new Date(body.dataScadenza) : null

  const aggiornato = await prisma.comunicazioneStaff.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(aggiornato)
}

// DELETE /api/host/staff/[id]
export async function DELETE(
  _req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth
  const params = await paramsPromise

  const com = await prisma.comunicazioneStaff.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!com) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.comunicazioneStaff.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
