import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params: pp }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await pp
  const p = await prisma.pacchettoServizio.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!p) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  const body = await req.json()
  const { voci, ...data } = body
  const updated = await prisma.pacchettoServizio.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params: pp }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await pp
  const p = await prisma.pacchettoServizio.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!p) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  await prisma.pacchettoServizio.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
