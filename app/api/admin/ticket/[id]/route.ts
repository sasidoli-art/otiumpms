import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { auditFromAuth } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  stato: z.enum(['APERTO', 'IN_LAVORAZIONE', 'IN_ATTESA_RISPOSTA', 'RISOLTO', 'CHIUSO']).optional(),
  priorita: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).optional(),
  assegnatoA: z.string().nullable().optional(),
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
      user: { select: { id: true, nome: true, cognome: true, email: true, role: true } },
      host: { select: { id: true, nomeAzienda: true, user: { select: { email: true } } } },
      risposte: {
        orderBy: { createdAt: 'asc' },
      },
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
  const existing = await prisma.ticket.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  if (d.stato) updateData.stato = d.stato
  if (d.priorita) updateData.priorita = d.priorita
  if (d.assegnatoA !== undefined) updateData.assegnatoA = d.assegnatoA
  if (d.rispostaAdmin !== undefined) {
    updateData.rispostaAdmin = d.rispostaAdmin
    updateData.rispostoDa = auth.user.name ?? auth.user.email
    updateData.rispostoAt = new Date()
  }

  const ticket = await prisma.ticket.update({ where: { id }, data: updateData })

  const azioni: string[] = []
  if (d.stato && d.stato !== existing.stato) azioni.push(`stato ${existing.stato}→${d.stato}`)
  if (d.priorita && d.priorita !== existing.priorita) azioni.push(`priorita ${existing.priorita}→${d.priorita}`)
  if (d.assegnatoA !== undefined) azioni.push(`assegnato a ${d.assegnatoA ?? 'nessuno'}`)
  if (azioni.length > 0) {
    await auditFromAuth(auth, {
      azione: 'ticket.aggiornato',
      entita: 'ticket',
      entitaId: id,
      dettagli: azioni.join(' · '),
    })
  }

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
