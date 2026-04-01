import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  stato: z.enum(['APERTO', 'IN_LAVORAZIONE', 'RISOLTO', 'CHIUSO']).optional(),
  priorita: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).optional(),
  rispostaAdmin: z.string().optional(),
})

// GET /api/admin/ticket/[id] — dettaglio ticket
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { nome: true, cognome: true, email: true, role: true } },
      host: { select: { nomeAzienda: true } },
    },
  })

  if (!ticket) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(ticket)
}

// PATCH /api/admin/ticket/[id] — aggiorna stato/risposta
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }

  const d = parsed.data
  const updateData: Record<string, unknown> = {}

  if (d.stato) updateData.stato = d.stato
  if (d.priorita) updateData.priorita = d.priorita
  if (d.rispostaAdmin !== undefined) {
    updateData.rispostaAdmin = d.rispostaAdmin
    updateData.rispostoDa = auth.user.name ?? auth.user.email
    updateData.rispostoAt = new Date()
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(ticket)
}

// DELETE /api/admin/ticket/[id]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  await prisma.ticket.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
