import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

// PATCH /api/host/strutture/[id]/unita/[unitaId]
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; unitaId: string }> }
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  // Verify ownership
  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const existing = await prisma.unitaPrenotabile.findFirst({
    where: { id: params.unitaId, strutturaId: params.id },
  })
  if (!existing) return NextResponse.json({ error: 'Unita non trovata' }, { status: 404 })

  const body = await req.json()

  const unita = await prisma.unitaPrenotabile.update({
    where: { id: params.unitaId },
    data: {
      nome: body.nome ?? existing.nome,
      descrizione: body.descrizione !== undefined ? body.descrizione : existing.descrizione,
      capacita: body.capacita != null ? Number(body.capacita) : existing.capacita,
      prezzoBase: body.prezzoBase != null ? Number(body.prezzoBase) : existing.prezzoBase,
      attiva: body.attiva ?? existing.attiva,
      immagine: body.immagine !== undefined ? (body.immagine || null) : existing.immagine,
    },
  })

  return NextResponse.json(unita)
}

// DELETE /api/host/strutture/[id]/unita/[unitaId]
export async function DELETE(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; unitaId: string }> }
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const existing = await prisma.unitaPrenotabile.findFirst({
    where: { id: params.unitaId, strutturaId: params.id },
  })
  if (!existing) return NextResponse.json({ error: 'Unita non trovata' }, { status: 404 })

  await prisma.unitaPrenotabile.delete({ where: { id: params.unitaId } })
  return new NextResponse(null, { status: 204 })
}
