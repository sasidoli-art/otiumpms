import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function DELETE(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const canale = await prisma.canaleEsterno.findFirst({
    where: { id, struttura: { hostId: auth.user.hostId } },
  })
  if (!canale) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.canaleEsterno.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const canale = await prisma.canaleEsterno.findFirst({
    where: { id, struttura: { hostId: auth.user.hostId } },
  })
  if (!canale) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.nome !== undefined) data.nome = body.nome
  if (body.urlIcal !== undefined) data.urlIcal = body.urlIcal
  if (body.attivo !== undefined) data.attivo = body.attivo
  if (body.colore !== undefined) data.colore = body.colore

  const updated = await prisma.canaleEsterno.update({ where: { id }, data })
  return NextResponse.json(updated)
}
