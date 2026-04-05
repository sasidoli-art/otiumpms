import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * DELETE /api/host/spa/terapisti/[id]/disponibilita/[slotId]
 * PUT    /api/host/spa/terapisti/[id]/disponibilita/[slotId]
 */
export async function PUT(
  req: NextRequest,
  { params: p }: { params: Promise<{ id: string; slotId: string }> }
) {
  const { id, slotId } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const slot = await prisma.disponibilitaTerapista.findFirst({
    where: { id: slotId, terapistaId: id, hostId: auth.user.hostId },
  })
  if (!slot) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.disponibilitaTerapista.update({
    where: { id: slotId },
    data: {
      ...(body.tipo && { tipo: body.tipo }),
      ...(body.giorno !== undefined && { giorno: body.giorno !== null ? Number(body.giorno) : null }),
      ...(body.data !== undefined && { data: body.data ? new Date(body.data) : null }),
      ...(body.orarioInizio && { orarioInizio: body.orarioInizio }),
      ...(body.orarioFine && { orarioFine: body.orarioFine }),
      ...(body.attiva !== undefined && { attiva: body.attiva }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params: p }: { params: Promise<{ id: string; slotId: string }> }
) {
  const { id, slotId } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const slot = await prisma.disponibilitaTerapista.findFirst({
    where: { id: slotId, terapistaId: id, hostId: auth.user.hostId },
  })
  if (!slot) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.disponibilitaTerapista.delete({ where: { id: slotId } })
  return NextResponse.json({ ok: true })
}
