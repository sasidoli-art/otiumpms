import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseWebhookMessages, sendWhatsAppMessage, verifyWebhookSignature } from '@/lib/whatsapp'
import { processGuestMessage } from '@/lib/concierge'
import { logger } from '@/lib/logger'

/**
 * GET /api/whatsapp/webhook
 * Verifica webhook Meta (challenge response).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const mode = sp.get('hub.mode')
  const token = sp.get('hub.verify_token')
  const challenge = sp.get('hub.challenge')

  if (mode === 'subscribe') {
    // Trova l'host con questo verify token
    const host = await prisma.host.findFirst({
      where: { whatsappVerifyToken: token, conciergeAttivo: true },
    })

    if (host) {
      return new NextResponse(challenge, { status: 200 })
    }
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST /api/whatsapp/webhook
 * Riceve messaggi da Meta Cloud API e risponde via AI Concierge.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  let payload: any

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Parse messaggi dal webhook
  const { parseWebhookMessages: parse } = await import('@/lib/whatsapp')
  const messages = parse(payload)

  for (const msg of messages) {
    try {
      // Trova l'host dal phoneNumberId
      const host = await prisma.host.findFirst({
        where: { whatsappNumeroId: msg.phoneNumberId, conciergeAttivo: true },
      })

      if (!host) {
        logger.warn(`Webhook WhatsApp: nessun host per phoneNumberId ${msg.phoneNumberId}`)
        continue
      }

      // Processa il messaggio con l'AI Concierge
      const result = await processGuestMessage({
        hostId: host.id,
        telefono: msg.from,
        nomeWhatsApp: msg.name,
        testo: msg.text,
        messageId: msg.messageId,
      })

      // Se c'è una risposta, inviala via WhatsApp
      if (result.response && host.whatsappAccessToken) {
        await sendWhatsAppMessage({
          phoneNumberId: msg.phoneNumberId,
          accessToken: host.whatsappAccessToken,
          to: msg.from,
          text: result.response,
        })
      }
    } catch (err) {
      logger.error(`Webhook WhatsApp errore per messaggio da ${msg.from}`, { error: String(err) })
    }
  }

  // Meta richiede sempre 200
  return NextResponse.json({ status: 'ok' })
}
