import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmailNuovoMessaggio } from '@/lib/email'
import { parseBody, messaggioChatSchema } from '@/lib/validations'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { chatEventBus } from '@/lib/chat-events'
import { audit } from '@/lib/audit'

// GET  /api/book/chat/[id]  — messaggi della chat (per l'ospite, senza auth)
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const chat = await prisma.chat.findUnique({
    where: { id: params.id },
    include: {
      messaggi: { orderBy: { createdAt: 'asc' }, take: 100 },
      prenotazione: {
        select: {
          guestNome: true,
          guestCognome: true,
          struttura: { select: { nome: true } },
        },
      },
    },
  })

  if (!chat) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Segna messaggi HOST come letti dall'ospite
  const updated = await prisma.messaggio.updateMany({
    where: { chatId: params.id, mittente: 'HOST', letto: false },
    data: { letto: true },
  })

  if (updated.count > 0) {
    chatEventBus.publish({ type: 'read', chatId: params.id, data: { by: 'GUEST' } })
  }

  return NextResponse.json(chat)
}

// POST /api/book/chat/[id]  — invia messaggio come GUEST
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  // ── Rate limiting: max 30 messaggi per IP ogni 10 minuti ───────────────────
  const ip = getClientIp(req)
  const rl = rateLimit(`chat:${ip}`, { windowMs: 10 * 60 * 1000, max: 30 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Troppi messaggi. Riprova tra poco.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const params = await paramsPromise

  const chat = await prisma.chat.findUnique({
    where: { id: params.id },
    include: {
      prenotazione: {
        select: {
          guestNome: true,
          guestCognome: true,
          guestEmail: true,
          struttura: { select: { nome: true } },
        },
      },
      host: { select: { nomeAzienda: true, user: { select: { email: true } } } },
    },
  })
  if (!chat) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // ── Validazione body ───────────────────────────────────────────────────────
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(messaggioChatSchema, raw)
  if (parsed.error) return parsed.error
  const { testo } = parsed.data

  const messaggio = await prisma.messaggio.create({
    data: { chatId: params.id, mittente: 'GUEST', testo },
  })

  await prisma.chat.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  })

  // GDPR Art. 30 — log invio messaggio ospite (non autenticato)
  await audit({
    hostId: null,
    userId: null,
    userEmail: chat.prenotazione.guestEmail,
    azione: 'messaggio.inviato',
    entita: 'messaggio',
    entitaId: messaggio.id,
    dettagli: `Messaggio GUEST→HOST chat=${params.id} len=${testo.length}`,
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent'),
  })

  // ── Notifica host via email (non bloccante) ────────────────────────────────
  try {
    await sendEmailNuovoMessaggio({
      destinatarioEmail: chat.host.user.email,
      destinatarioNome: chat.host.nomeAzienda,
      mittenteNome: `${chat.prenotazione.guestNome} ${chat.prenotazione.guestCognome}`,
      strutturaNome: chat.prenotazione.struttura?.nome ?? 'N/D',
      testo,
      chatUrl: `${process.env.NEXTAUTH_URL}/host/prenotazioni/${chat.prenotazioneId}`,
    })
  } catch (err) {
    logger.error('Invio email nuovo messaggio fallito', 'chat/route', {
      chatId: params.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // Publish real-time event
  chatEventBus.publish({
    type: 'message',
    chatId: params.id,
    data: messaggio,
  })

  return NextResponse.json(messaggio, { status: 201 })
}
