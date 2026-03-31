import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const articolo = await prisma.articoloMagazzino.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!articolo) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.nome !== undefined) data.nome = body.nome
  if (body.categoria !== undefined) data.categoria = body.categoria
  if (body.unita !== undefined) data.unita = body.unita
  if (body.scorteMinime !== undefined) data.scorteMinime = body.scorteMinime
  if (body.scorteOttimali !== undefined) data.scorteOttimali = body.scorteOttimali
  if (body.costoUnitario !== undefined) data.costoUnitario = body.costoUnitario
  if (body.fornitore !== undefined) data.fornitore = body.fornitore
  if (body.codiceArticolo !== undefined) data.codiceArticolo = body.codiceArticolo
  if (body.ubicazione !== undefined) data.ubicazione = body.ubicazione
  if (body.note !== undefined) data.note = body.note

  const updated = await prisma.articoloMagazzino.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const articolo = await prisma.articoloMagazzino.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!articolo) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.articoloMagazzino.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
