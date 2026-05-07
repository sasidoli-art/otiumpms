import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// PATCH /api/host/housekeeping/task/[id] — completa / aggiorna task
export async function PATCH(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const params = await paramsPromise
  const body = await req.json()

  const task = await prisma.taskHK.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!task) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.completato !== undefined) {
    data.completato = body.completato
    data.completatoAt = body.completato ? new Date() : null
  }
  if (body.assegnatoA !== undefined) data.assegnatoA = body.assegnatoA
  if (body.note !== undefined) data.note = body.note
  if (body.priorita !== undefined) data.priorita = body.priorita

  const aggiornato = await prisma.taskHK.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(aggiornato)
}

// DELETE /api/host/housekeeping/task/[id]
export async function DELETE(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const params = await paramsPromise

  const task = await prisma.taskHK.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!task) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.taskHK.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
