import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { auditFromAuth } from '@/lib/audit'
import { sanitizeText, stripHtml } from '@/lib/sanitize'
import { sendEmailGeneric } from '@/lib/email'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({
  testo: z.string().min(1).max(10000),
  allegati: z.array(z.object({ nome: z.string(), url: z.string() })).optional(),
  // Se true, aggiorna anche lo stato a IN_ATTESA_RISPOSTA (admin ha risposto, aspetta feedback host)
  segnaAttesaRisposta: z.boolean().optional(),
})

// POST /api/admin/ticket/[id]/risposte — admin risponde al thread
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const raw = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, nome: true } },
      host: { select: { nomeAzienda: true, user: { select: { email: true } } } },
    },
  })
  if (!ticket) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const testoSanitized = stripHtml(parsed.data.testo).slice(0, 10000)

  const risposta = await prisma.$transaction(async (tx) => {
    const r = await tx.ticketRisposta.create({
      data: {
        ticketId: id,
        autoreId: auth.user.id,
        autoreEmail: auth.user.email,
        autoreRuolo: 'admin',
        testo: testoSanitized,
        allegati: parsed.data.allegati
          ? (parsed.data.allegati as unknown as object)
          : undefined,
      },
    })

    await tx.ticket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        ...(parsed.data.segnaAttesaRisposta ? { stato: 'IN_ATTESA_RISPOSTA' } : {}),
      },
    })

    return r
  })

  await auditFromAuth(auth, {
    azione: 'ticket.risposta.admin',
    entita: 'ticket',
    entitaId: id,
    dettagli: `Risposta admin al ticket "${ticket.oggetto}" (${testoSanitized.length} char)`,
  })

  // Notifica email all'autore ospite del ticket (non bloccante)
  const destinatarioEmail = ticket.user.email
  if (destinatarioEmail) {
    const oggetto = `[Otium Supporto] Risposta al ticket: ${ticket.oggetto}`
    const body = `Ciao ${ticket.user.nome ?? ''},\n\nhai ricevuto una risposta al tuo ticket di supporto.\n\n---\n${sanitizeText(testoSanitized, 2000)}\n---\n\nApri il ticket: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/host/supporto/${id}\n\nOtium Supporto`
    sendEmailGeneric({
      to: destinatarioEmail,
      subject: oggetto,
      text: body,
      hostId: ticket.hostId,
    }).catch(() => { /* non bloccante */ })
  }

  return NextResponse.json(risposta, { status: 201 })
}
