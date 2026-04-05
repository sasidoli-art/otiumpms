import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendEmailNuovoMessaggio } from '@/lib/email'

// GET  /api/host/chat/[id]  — messaggi della chat
// POST /api/host/chat/[id]  — invia messaggio come HOST

export async function GET(_: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const chat = await prisma.chat.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
    include: {
      messaggi: { orderBy: { createdAt: 'asc' }, take: 100 },
      prenotazione: {
        select: {
          id: true, guestNome: true, guestCognome: true, guestEmail: true,
          struttura: { select: { nome: true } },
        },
      },
    },
  })

  if (!chat) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Segna messaggi GUEST come letti
  await prisma.messaggio.updateMany({
    where: { chatId: params.id, mittente: 'GUEST', letto: false },
    data: { letto: true },
  })

  return NextResponse.json(chat)
}

export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const chat = await prisma.chat.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
    include: {
      prenotazione: {
        select: {
          guestEmail: true, guestNome: true, guestCognome: true,
          struttura: { select: { nome: true } },
        },
      },
    },
  })
  if (!chat) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const { testo, canale = 'CHAT' } = body
  if (!testo?.trim()) return NextResponse.json({ error: 'Testo vuoto' }, { status: 400 })

  const canaleValido = ['CHAT', 'EMAIL', 'WHATSAPP', 'SMS'].includes(canale) ? canale : 'CHAT'

  const messaggio = await prisma.messaggio.create({
    data: { chatId: params.id, mittente: 'HOST', testo: testo.trim(), canale: canaleValido },
  })

  // Aggiorna updatedAt della chat
  await prisma.chat.update({ where: { id: params.id }, data: { updatedAt: new Date() } })

  // Notifica via email: sempre se canale=EMAIL, oppure come notifica silenziosa per CHAT
  const inviaEmail = canaleValido === 'EMAIL' || canaleValido === 'CHAT'
  if (inviaEmail) {
    try {
      const host = await prisma.host.findUnique({ where: { id: auth.user.hostId } })
      const p = chat.prenotazione
      await sendEmailNuovoMessaggio({
        destinatarioEmail: p.guestEmail,
        destinatarioNome: `${p.guestNome} ${p.guestCognome}`,
        mittenteNome: host?.nomeAzienda ?? 'Host',
        strutturaNome: p.struttura?.nome ?? 'N/D',
        testo: testo.trim(),
        chatUrl: `${process.env.NEXTAUTH_URL}/book/chat/${chat.id}`,
        chatId: chat.id,
        hostId: auth.user.hostId,
      })
    } catch (err) {
      console.error('[chat-email]', err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json(messaggio, { status: 201 })
}
