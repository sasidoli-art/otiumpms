import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { notificaSuperadmin, type PrioritaNotifica } from '@/lib/notify-superadmin'
import { sanitizeText, stripHtml } from '@/lib/sanitize'
import { logger } from '@/lib/logger'

// ─── Schema ──────────────────────────────────────────────────────────────────

const ticketSchema = z.object({
  oggetto: z.string().min(3).max(200),
  descrizione: z.string().min(10).max(5000),
  categoria: z.enum(['BUG', 'FEATURE_REQUEST', 'DOMANDA', 'PROBLEMA_ACCOUNT', 'ALTRO']).default('BUG'),
  priorita: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).default('NORMALE'),
  paginaUrl: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
  screenshot: z.string().max(500_000).optional(),
})

const SCREENSHOT_MAX_BYTES = 500_000

// ─── POST /api/ticket ────────────────────────────────────────────────────────
//
// Flusso atomico:
//   1. Auth + rate limit
//   2. Validazione + sanitizzazione
//   3. prisma.$transaction → ticket + auditLog (ATOMICO)
//   4. SOLO DOPO COMMIT: notificaSuperadmin() fire-and-forget
//      crea NotificaSuperadmin + enqueue email + Slack
//
// Se la transaction rollback: nessuna notifica parte.
// Se la notifica fallisce: ticket e` gia` persistito (corretto).

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // 2. Rate limit: 5 ticket/ora per utente
  const rl = rateLimit(`ticket:${session.user.id}`, {
    windowMs: 60 * 60 * 1000,
    max: 5,
  })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Troppe segnalazioni. Riprova tra qualche minuto.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  // 3. Validazione
  const body = await req.json().catch(() => ({}))
  const parsed = ticketSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati non validi', details: parsed.error.flatten() },
      { status: 422 },
    )
  }
  const d = parsed.data

  if (d.screenshot && new TextEncoder().encode(d.screenshot).length > SCREENSHOT_MAX_BYTES) {
    return NextResponse.json({ error: 'Screenshot troppo grande (max 500KB)' }, { status: 413 })
  }

  const hostId = (session.user.role === 'HOST' && session.user.hostId)
    ? session.user.hostId
    : null

  // 4. Transazione atomica: SOLO ticket + audit (no notifiche qui)
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
          paginaUrl: d.paginaUrl,
          userAgent: d.userAgent,
          screenshot: d.screenshot,
        },
        include: {
          user: { select: { id: true, nome: true, cognome: true, email: true } },
          host: { select: { id: true, nomeAzienda: true } },
        },
      })

      await tx.auditLog.create({
        data: {
          hostId: hostId ?? null,
          userId: session.user.id,
          userEmail: session.user.email ?? null,
          azione: 'ticket.creato',
          entita: 'ticket',
          entitaId: t.id,
          dettagli: `Ticket "${t.oggetto}" | categoria=${t.categoria} | priorita=${t.priorita}`,
        },
      })

      return t
    })
  } catch (err) {
    logger.error('Creazione ticket fallita', 'api/ticket', {
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  // 5. Post-commit: notifiche fire-and-forget (in-app + email + Slack nel servizio)
  const isUrgente = ticket.priorita === 'URGENTE' || ticket.priorita === 'ALTA'
  const autoreNome = `${ticket.user.nome} ${ticket.user.cognome}`.trim() || ticket.user.email

  void notificaSuperadmin({
    tipo: isUrgente ? 'ticket.urgente' : 'ticket.nuovo',
    emailTemplate: isUrgente ? 'ticket_urgente_superadmin' : 'ticket_nuovo_superadmin',
    titolo: isUrgente
      ? `🔴 Ticket ${ticket.priorita}: ${ticket.oggetto}`
      : `Nuovo ticket: ${ticket.oggetto}`,
    messaggio: sanitizeText(ticket.descrizione, 1500),
    linkUrl: `/superadmin/tickets/${ticket.id}`,
    priorita: ticket.priorita as PrioritaNotifica,
    entitaTipo: 'ticket',
    entitaId: ticket.id,
    autore: { nome: autoreNome, email: ticket.user.email },
    hostNome: ticket.host?.nomeAzienda,
    categoria: ticket.categoria,
  })

  return NextResponse.json(ticket, { status: 201 })
}

// ─── GET /api/ticket — lista dell'utente corrente ────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(tickets)
}
