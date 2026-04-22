import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sanitizeText, stripHtml } from '@/lib/sanitize'
import { notificaSuperadmin } from '@/lib/notify-superadmin'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({
  testo: z.string().min(1).max(10000),
})

// POST /api/host/supporto/[id]/risposte — host risponde al thread
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await params

  const rl = rateLimit(`supporto-risposta:${session.user.id}`, { windowMs: 60 * 1000, max: 10 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppe risposte, rallenta' }, { status: 429 })
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Testo non valido' }, { status: 422 })

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { host: { select: { nomeAzienda: true } }, user: { select: { nome: true, cognome: true } } },
  })
  if (!ticket) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const isOwner = ticket.userId === session.user.id
  const isSameHost = session.user.role === 'HOST'
    && session.user.hostId
    && ticket.hostId === session.user.hostId
  if (!isOwner && !isSameHost) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const testoSanitized = stripHtml(parsed.data.testo).slice(0, 10000)

  const risposta = await prisma.$transaction(async (tx) => {
    const r = await tx.ticketRisposta.create({
      data: {
        ticketId: id,
        autoreId: session.user.id,
        autoreEmail: session.user.email,
        autoreRuolo: 'host',
        testo: testoSanitized,
      },
    })
    // Quando l'host risponde, se il ticket era IN_ATTESA_RISPOSTA torna APERTO
    await tx.ticket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        ...(ticket.stato === 'IN_ATTESA_RISPOSTA' ? { stato: 'APERTO' } : {}),
      },
    })
    return r
  })

  // Notifica admin che c'e` una risposta da parte del host
  const autoreNome = `${ticket.user.nome} ${ticket.user.cognome}`.trim() || session.user.email
  void notificaSuperadmin({
    tipo: 'ticket.risposta',
    emailTemplate: 'sistema_avviso_superadmin',
    titolo: `Risposta ticket: ${ticket.oggetto}`,
    messaggio: `${autoreNome} ha risposto al ticket.\n\n${sanitizeText(testoSanitized, 800)}`,
    linkUrl: `/admin/ticket?id=${id}`,
    priorita: 'NORMALE',
    entitaTipo: 'ticket',
    entitaId: id,
    autore: { nome: autoreNome, email: session.user.email },
    hostNome: ticket.host?.nomeAzienda,
  })

  return NextResponse.json(risposta, { status: 201 })
}
