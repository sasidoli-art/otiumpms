/**
 * High-level sender per WhatsApp Business Cloud API.
 *
 * Legge credenziali host (whatsappNumeroId + whatsappAccessToken cifrato),
 * chiama l'API Meta via il client low-level `sendWhatsAppMessage`, registra
 * l'esito in audit log.
 *
 * Usa questo modulo per tutti gli invii WA applicativi (concierge, reminder,
 * conferme, follow-up). Non chiamare `sendWhatsAppMessage` direttamente dal
 * codice di business — passa da qui per garantire logging + error handling
 * uniforme.
 */

import { prisma } from '@/lib/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { getHostSecret } from '@/lib/host-secrets'
import { audit } from '@/lib/audit'
import { logger } from '@/lib/logger'

export class WhatsAppNotConfiguredError extends Error {
  constructor(hostId: string, missing: string[]) {
    super(`WhatsApp non configurato per host ${hostId}: manca ${missing.join(', ')}`)
    this.name = 'WhatsAppNotConfiguredError'
  }
}

export class WhatsAppSendError extends Error {
  constructor(message: string, public readonly to: string) {
    super(message)
    this.name = 'WhatsAppSendError'
  }
}

/**
 * Invia un messaggio di testo (freeform) via WhatsApp.
 *
 * Nota: freeform può essere inviato solo entro la finestra 24h dall'ultimo
 * messaggio dell'utente. Fuori finestra → `inviaTemplateWhatsApp`.
 */
export async function inviaMessaggioWhatsApp(
  hostId: string,
  destinatario: string,
  testo: string,
): Promise<{ messageId: string }> {
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { whatsappNumeroId: true },
  })

  const missing: string[] = []
  if (!host?.whatsappNumeroId) missing.push('whatsappNumeroId')

  const accessToken = await getHostSecret(hostId, 'whatsappAccessToken')
  if (!accessToken) missing.push('whatsappAccessToken')

  if (missing.length > 0) {
    throw new WhatsAppNotConfiguredError(hostId, missing)
  }

  const res = await sendWhatsAppMessage({
    phoneNumberId: host!.whatsappNumeroId!,
    accessToken: accessToken!,
    to: destinatario,
    text: testo,
  })

  if (!res.success || !res.messageId) {
    await audit({
      userId: 'system',
      userEmail: 'whatsapp@otium',
      hostId,
      azione: 'whatsapp.invio.fallito',
      entita: 'WhatsApp',
      entitaId: destinatario,
      dettagli: `Invio fallito a ${destinatario}`,
    })
    throw new WhatsAppSendError('Invio WhatsApp fallito', destinatario)
  }

  await audit({
    userId: 'system',
    userEmail: 'whatsapp@otium',
    hostId,
    azione: 'whatsapp.invio.ok',
    entita: 'WhatsApp',
    entitaId: res.messageId,
    dettagli: `Messaggio inviato a ${destinatario}`,
  })

  return { messageId: res.messageId }
}

/**
 * Invia un message template pre-approvato da Meta (richiede template configurato
 * in Meta Business Manager). Usato per messaggi proattivi fuori finestra 24h:
 * reminder check-in, conferma prenotazione, follow-up post-soggiorno.
 *
 * Il template e i parametri devono corrispondere al template registrato su Meta,
 * altrimenti il messaggio viene rifiutato con errore 132000.
 */
export async function inviaTemplateWhatsApp(
  hostId: string,
  destinatario: string,
  templateName: string,
  params: string[] = [],
  lingua: string = 'it',
): Promise<{ messageId: string }> {
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { whatsappNumeroId: true },
  })

  const missing: string[] = []
  if (!host?.whatsappNumeroId) missing.push('whatsappNumeroId')

  const accessToken = await getHostSecret(hostId, 'whatsappAccessToken')
  if (!accessToken) missing.push('whatsappAccessToken')

  if (missing.length > 0) {
    throw new WhatsAppNotConfiguredError(hostId, missing)
  }

  const toClean = destinatario.startsWith('+') ? destinatario.slice(1) : destinatario

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${host!.whatsappNumeroId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toClean,
          type: 'template',
          template: {
            name: templateName,
            language: { code: lingua },
            ...(params.length > 0
              ? {
                  components: [
                    {
                      type: 'body',
                      parameters: params.map((p) => ({ type: 'text', text: p })),
                    },
                  ],
                }
              : {}),
          },
        }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      logger.error('WhatsApp template send error', {
        status: res.status, body: err.slice(0, 300), to: destinatario, template: templateName,
      })
      await audit({
        userId: 'system',
        userEmail: 'whatsapp@otium',
        hostId,
        azione: 'whatsapp.template.fallito',
        entita: 'WhatsApp',
        entitaId: destinatario,
        dettagli: `Template ${templateName} fallito: ${err.slice(0, 200)}`,
      })
      throw new WhatsAppSendError(`Template send failed: ${res.status}`, destinatario)
    }

    const data = await res.json()
    const messageId = data.messages?.[0]?.id ?? null
    if (!messageId) throw new WhatsAppSendError('Template risposta senza messageId', destinatario)

    await audit({
      userId: 'system',
      userEmail: 'whatsapp@otium',
      hostId,
      azione: 'whatsapp.template.ok',
      entita: 'WhatsApp',
      entitaId: messageId,
      dettagli: `Template ${templateName} inviato a ${destinatario}`,
    })

    return { messageId }
  } catch (err) {
    if (err instanceof WhatsAppSendError) throw err
    logger.error('WhatsApp template network error', { error: String(err), to: destinatario })
    throw new WhatsAppSendError('Network error', destinatario)
  }
}
