import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sanitizeText, stripHtml } from '@/lib/sanitize'
import { notificaSuperadmin, type PrioritaNotifica } from '@/lib/notify-superadmin'
import { logger } from '@/lib/logger'

const createSchema = z.object({
  oggetto: z.string().min(3).max(200),
  descrizione: z.string().min(10).max(5000),
  categoria: z.enum(['BUG', 'FEATURE_REQUEST', 'DOMANDA', 'PROBLEMA_ACCOUNT', 'ALTRO']).default('DOMANDA'),
  priorita: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).default('NORMALE'),
})

// GET /api/host/supporto — lista ticket dell'host corrente
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const where: Record<string, unknown> = { userId: session.user.id }
  if (session.user.role === 'HOST' && session.user.hostId) {
    // HOST vede anche ticket aperti da altri utenti del suo host
    where.OR = [
      { userId: session.user.id },
      { hostId: session.user.hostId },
    ]
    delete where.userId
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
    take: 50,
    select: {
      id: true, oggetto: true, categoria: true, priorita: true, stato: true,
      createdAt: true, updatedAt: true,
      _count: { select: { risposte: true } },
    },
  })

  return NextResponse.json({ tickets })
}

// POST /api/host/supporto — crea ticket lato HOST
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  // Rate limit 5/h/user
  const rl = rateLimit(`supporto:${session.user.id}`, { windowMs: 60 * 60 * 1000, max: 5 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Troppi ticket. Riprova tra qualche minuto.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const d = parsed.data

  const hostId = (session.user.role === 'HOST' && session.user.hostId) ? session.user.hostId : null

  let ticket
  try {
    ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.create({
        data: {
          userId: session.user.id,
          hostId: hostId ?? undefined,
          oggetto: stripHtml(d.oggetto).slice(0, 200),
          descrizione: stripHtml(d.descrizione).slice(0, 5000),
          categoria: d.categoria,
          priorita: d.priorita,
        },
        include: {
          user: { select: { nome: true, cognome: true, email: true } },
          host: { select: { nomeAzienda: true } },
        },
      })
      await tx.auditLog.create({
        data: {
          hostId: hostId ?? null,
          userId: session.user.id,
          userEmail: session.user.email,
          azione: 'ticket.creato',
          entita: 'ticket',
          entitaId: t.id,
          dettagli: `Supporto: "${t.oggetto}" | categoria=${t.categoria} | priorita=${t.priorita}`,
        },
      })
      return t
    })
  } catch (err) {
    logger.error('Creazione ticket supporto fallita', 'host/supporto', { error: String(err) })
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  // Notifica admin/superadmin
  const isUrgente = ticket.priorita === 'URGENTE' || ticket.priorita === 'ALTA'
  const autoreNome = `${ticket.user.nome} ${ticket.user.cognome}`.trim() || ticket.user.email
  void notificaSuperadmin({
    tipo: isUrgente ? 'ticket.urgente' : 'ticket.nuovo',
    emailTemplate: isUrgente ? 'ticket_urgente_superadmin' : 'ticket_nuovo_superadmin',
    titolo: isUrgente ? `🔴 Ticket ${ticket.priorita}: ${ticket.oggetto}` : `Nuovo ticket: ${ticket.oggetto}`,
    messaggio: sanitizeText(ticket.descrizione, 1500),
    linkUrl: `/admin/ticket?id=${ticket.id}`,
    priorita: ticket.priorita as PrioritaNotifica,
    entitaTipo: 'ticket',
    entitaId: ticket.id,
    autore: { nome: autoreNome, email: ticket.user.email },
    hostNome: ticket.host?.nomeAzienda,
    categoria: ticket.categoria,
  })

  return NextResponse.json(ticket, { status: 201 })
}
