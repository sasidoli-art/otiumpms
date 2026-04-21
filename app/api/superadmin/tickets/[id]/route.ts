import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { sanitizeText, stripHtml } from '@/lib/sanitize'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/superadmin/tickets/[id] — dettaglio + audit trail
export async function GET(_: NextRequest, { params: paramsPromise }: RouteParams) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const [ticket, audit] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nome: true, cognome: true, email: true, role: true } },
        host: { select: { id: true, nomeAzienda: true, telefono: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { entita: 'ticket', entitaId: id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    }),
  ])

  if (!ticket) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  return NextResponse.json({ ticket, audit })
}

// PATCH /api/superadmin/tickets/[id]
const updateSchema = z.object({
  stato: z.enum(['APERTO', 'IN_LAVORAZIONE', 'IN_ATTESA_RISPOSTA', 'RISOLTO', 'CHIUSO']).optional(),
  priorita: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).optional(),
  rispostaAdmin: z.string().max(5000).optional(),
  notaInterna: z.string().max(2000).optional(),
})

export async function PATCH(req: NextRequest, { params: paramsPromise }: RouteParams) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const raw = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const d = parsed.data

  const existing = await prisma.ticket.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  if (d.stato) updateData.stato = d.stato
  if (d.priorita) updateData.priorita = d.priorita
  if (d.rispostaAdmin !== undefined) {
    updateData.rispostaAdmin = stripHtml(d.rispostaAdmin).slice(0, 5000)
    updateData.rispostoDa = auth.user.id
    updateData.rispostoAt = new Date()
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({ where: { id }, data: updateData })

    const azioni: string[] = []
    if (d.stato && d.stato !== existing.stato) azioni.push(`stato ${existing.stato}→${d.stato}`)
    if (d.priorita && d.priorita !== existing.priorita) azioni.push(`priorita ${existing.priorita}→${d.priorita}`)
    if (d.rispostaAdmin !== undefined) azioni.push('risposta aggiornata')
    if (d.notaInterna !== undefined) azioni.push(`nota interna: ${sanitizeText(d.notaInterna, 200)}`)

    if (azioni.length > 0) {
      await tx.auditLog.create({
        data: {
          hostId: existing.hostId,
          userId: auth.user.id,
          userEmail: auth.user.email,
          azione: 'ticket.aggiornato',
          entita: 'ticket',
          entitaId: id,
          dettagli: azioni.join(' · '),
        },
      })
    }

    return updated
  })

  return NextResponse.json(ticket)
}

// DELETE /api/superadmin/tickets/[id]
export async function DELETE(_: NextRequest, { params: paramsPromise }: RouteParams) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const existing = await prisma.ticket.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.$transaction([
    prisma.ticket.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        hostId: existing.hostId,
        userId: auth.user.id,
        userEmail: auth.user.email,
        azione: 'ticket.eliminato',
        entita: 'ticket',
        entitaId: id,
        dettagli: `Ticket "${existing.oggetto}" eliminato da superadmin`,
      },
    }),
  ])

  return NextResponse.json({ ok: true })
}
