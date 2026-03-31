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

  const oggetto = await prisma.oggettoSmarrito.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!oggetto) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.stato !== undefined) data.stato = body.stato
  if (body.proprietarioNome !== undefined) data.proprietarioNome = body.proprietarioNome
  if (body.proprietarioEmail !== undefined) data.proprietarioEmail = body.proprietarioEmail
  if (body.proprietarioTelefono !== undefined) data.proprietarioTelefono = body.proprietarioTelefono
  if (body.luogoCustodia !== undefined) data.luogoCustodia = body.luogoCustodia
  if (body.noteRestituzione !== undefined) data.noteRestituzione = body.noteRestituzione
  if (body.note !== undefined) data.note = body.note

  if (body.stato === 'RESTITUITO' || body.stato === 'SPEDITO') {
    data.dataRestituzione = new Date()
  }

  const updated = await prisma.oggettoSmarrito.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const oggetto = await prisma.oggettoSmarrito.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!oggetto) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.oggettoSmarrito.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
