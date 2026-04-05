import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params: pp }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await pp
  const s = await prisma.servizioStruttura.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!s) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  const body = await req.json()
  const updated = await prisma.servizioStruttura.update({ where: { id }, data: body })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params: pp }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await pp
  const s = await prisma.servizioStruttura.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!s) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  await prisma.servizioStruttura.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
