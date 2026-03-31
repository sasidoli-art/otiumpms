/**
 * WhatsApp Business Cloud API Client
 *
 * Gestisce invio/ricezione messaggi via Meta Cloud API.
 * Include modalità simulatore per sviluppo/demo senza costi.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { logger } from '@/lib/logger'

// ─── Tipi webhook Meta ────────────────────────────────────────────────────────

export interface WhatsAppWebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: { display_phone_number: string; phone_number_id: string }
        contacts?: Array<{ profile: { name: string }; wa_id: string }>
        messages?: Array<{
          from: string       // numero mittente (E.164 senza +)
          id: string         // ID messaggio WhatsApp
          timestamp: string
          type: string
          text?: { body: string }
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
        }>
      }
      field: string
    }>
  }>
}

export interface WhatsAppIncomingMessage {
  from: string          // numero mittente con + (es. +393331234567)
  name: string          // nome profilo WhatsApp
  text: string          // testo messaggio
  messageId: string     // ID messaggio (per tracking)
  phoneNumberId: string // ID numero business che ha ricevuto
  timestamp: Date
}

// ─── Parser webhook ───────────────────────────────────────────────────────────

/**
 * Estrae i messaggi testuali da un webhook Meta.
 * Ignora messaggi non testuali (immagini, audio, ecc.) per ora.
 */
export function parseWebhookMessages(payload: WhatsAppWebhookPayload): WhatsAppIncomingMessage[] {
  const messages: WhatsAppIncomingMessage[] = []

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value
      if (!value.messages) continue

      const contacts = value.contacts || []

      for (const msg of value.messages) {
        if (msg.type !== 'text' || !msg.text?.body) continue

        const contact = contacts.find(c => c.wa_id === msg.from)
        messages.push({
          from: `+${msg.from}`,
          name: contact?.profile?.name || 'Ospite',
          text: msg.text.body,
          messageId: msg.id,
          phoneNumberId: value.metadata.phone_number_id,
          timestamp: new Date(parseInt(msg.timestamp) * 1000),
        })
      }
    }
  }

  return messages
}

// ─── Client invio messaggi ────────────────────────────────────────────────────

const META_API_URL = 'https://graph.facebook.com/v21.0'

/**
 * Invia un messaggio di testo via WhatsApp Business Cloud API.
 */
export async function sendWhatsAppMessage(params: {
  phoneNumberId: string
  accessToken: string
  to: string            // numero destinatario (E.164: +393331234567)
  text: string
}): Promise<{ messageId: string | null; success: boolean }> {
  const { phoneNumberId, accessToken, to, text } = params

  // Rimuovi + dal numero per Meta API
  const toClean = to.startsWith('+') ? to.slice(1) : to

  try {
    const res = await fetch(`${META_API_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toClean,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.error('WhatsApp send error', { status: res.status, body: err, to })
      return { messageId: null, success: false }
    }

    const data = await res.json()
    const messageId = data.messages?.[0]?.id || null

    return { messageId, success: true }
  } catch (err) {
    logger.error('WhatsApp send network error', { error: String(err), to })
    return { messageId: null, success: false }
  }
}

// ─── Verifica firma webhook (sicurezza) ───────────────────────────────────────

/**
 * Verifica la firma HMAC-SHA256 del webhook Meta.
 * Header: X-Hub-Signature-256 = sha256=<hash>
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signature || !signature.startsWith('sha256=')) return false

  const expected = signature.slice(7) // rimuovi "sha256="

  // Usa Web Crypto API (compatibile Edge Runtime)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === expected
}

// ─── Simulatore (sviluppo/demo) ──────────────────────────────────────────────

/**
 * Crea un payload webhook simulato, identico al formato Meta.
 * Usato dalla pagina /host/concierge/test per testare senza costi.
 */
export function createSimulatedWebhook(params: {
  from: string       // es. "+393331234567"
  name: string       // es. "Mario Rossi"
  text: string
  phoneNumberId?: string
}): WhatsAppWebhookPayload {
  const fromClean = params.from.startsWith('+') ? params.from.slice(1) : params.from
  const msgId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'SIMULATED',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '0000000000',
            phone_number_id: params.phoneNumberId || 'SIMULATOR',
          },
          contacts: [{
            profile: { name: params.name },
            wa_id: fromClean,
          }],
          messages: [{
            from: fromClean,
            id: msgId,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: { body: params.text },
          }],
        },
        field: 'messages',
      }],
    }],
  }
}
