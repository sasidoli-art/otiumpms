import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { sendEmailGeneric } from '@/lib/email'

/**
 * POST /api/host/prenotazioni/[id]/send-email
 *
 * Invia un'email all'ospite E la registra nella chat come messaggio HOST canale EMAIL.
 * Body: { to, subject, body }
 */
export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
    select: { id: true, guestEmail: true, chat: { select: { id: true } } },
  })
  if (!prenotazione) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const { subject, body } = await req.json()
  if (!subject || !body) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const to = prenotazione.guestEmail
  if (!to) return NextResponse.json({ error: 'Email ospite mancante' }, { status: 400 })

  try {
    console.log('[send-email] to:', to, 'subject:', subject, 'hostId:', auth.user.hostId)
    // Invia email
    await sendEmailGeneric({ to, subject, text: body, hostId: auth.user.hostId })
    console.log('[send-email] email sent, saving to chat...')

    // Registra nella chat (crea chat se non esiste)
    let chatId = prenotazione.chat?.id
    if (!chatId) {
      const chat = await prisma.chat.create({
        data: { prenotazioneId: prenotazione.id, hostId: auth.user.hostId! },
      })
      chatId = chat.id
    }

    await prisma.messaggio.create({
      data: {
        chatId,
        mittente: 'HOST',
        canale: 'EMAIL',
        testo: `📧 ${subject}\n\n${body}`,
        letto: false,
      },
    })

    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-email]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Errore invio email' }, { status: 500 })
  }
}
