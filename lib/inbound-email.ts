/**
 * Inbound Email — riceve email di risposta degli ospiti e le inserisce nelle chat.
 *
 * Due provider supportati:
 * 1. IMAP polling (default) — legge la casella email via IMAP ogni N minuti
 * 2. Webhook (futuro) — SendGrid/Mailgun chiama un endpoint con le email ricevute
 *
 * Il matching funziona tramite tag nel Subject: [OTM-{chatId}]
 * Quando l'host invia un'email dalla chat, il subject contiene questo tag.
 * Quando l'ospite risponde, il tag viene preservato nel subject della risposta.
 */

import { ImapFlow } from 'imapflow'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { simpleParser } from 'mailparser'

// Tag pattern per matching: [OTM-cxxxxxxxxxxxxxxx]
const CHAT_TAG_REGEX = /\[OTM-([a-z0-9]+)\]/i

/**
 * Estrae il chatId dal subject dell'email.
 */
export function extractChatId(subject: string): string | null {
  const match = subject.match(CHAT_TAG_REGEX)
  return match ? match[1] : null
}

/**
 * Genera il tag subject per una chat.
 */
export function chatSubjectTag(chatId: string): string {
  return `[OTM-${chatId}]`
}

/**
 * Pulisce il testo dell'email — rimuove firme, reply chain, spazi extra.
 */
function cleanEmailBody(text: string): string {
  // Taglia a partire da "On ... wrote:" o "Il ... ha scritto:" (reply chain)
  const replyPatterns = [
    /\r?\n\s*On .+wrote:\s*$/,
    /\r?\n\s*Il .+ha scritto:\s*$/,
    /\r?\n\s*Le .+a écrit\s*:\s*$/,
    /\r?\n--\s*\r?\n/,  // firma standard
    /\r?\n_{3,}/,        // linea separatore ___
  ]

  let cleaned = text
  for (const pattern of replyPatterns) {
    const idx = cleaned.search(pattern)
    if (idx > 0) {
      cleaned = cleaned.substring(0, idx)
    }
  }

  return cleaned.trim()
}

// ─── IMAP Provider ──────────────────────────────────────────────────────────

interface ImapConfig {
  host: string
  port: number
  user: string
  pass: string
  tls: boolean
}

/**
 * Connette via IMAP, legge le email non lette con tag [OTM-*],
 * le inserisce come messaggi GUEST nella chat corretta,
 * e le segna come lette.
 */
export async function pollInboundEmails(config: ImapConfig): Promise<number> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: { user: config.user, pass: config.pass },
    logger: false,
  })

  let processed = 0

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      // Cerca email non lette
      const messages = client.fetch(
        { seen: false },
        { source: true, flags: true, envelope: true }
      )

      for await (const msg of messages) {
        try {
          if (!msg.source) continue
          const parsed = await simpleParser(msg.source)
          const subject = parsed.subject ?? ''
          const chatId = extractChatId(subject)

          if (!chatId) continue // Non è una risposta a una chat Otium

          // Verifica che la chat esista
          const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            select: {
              id: true,
              prenotazione: {
                select: { guestEmail: true },
              },
            },
          })

          if (!chat) {
            logger.warn('Inbound email: chat non trovata', 'inbound-email', { chatId, subject })
            continue
          }

          // Verifica che il mittente sia l'ospite (match email)
          const fromAddr = parsed.from?.value?.[0]?.address?.toLowerCase()
          const guestEmail = chat.prenotazione.guestEmail?.toLowerCase()

          if (!fromAddr || fromAddr !== guestEmail) {
            logger.warn('Inbound email: mittente non corrisponde', 'inbound-email', {
              chatId, from: fromAddr, expected: guestEmail,
            })
            continue
          }

          // Estrai testo pulito
          const htmlText = typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : ''
          const rawText = parsed.text ?? htmlText
          const testo = cleanEmailBody(rawText)

          if (!testo) continue

          // Inserisci messaggio nella chat
          await prisma.messaggio.create({
            data: {
              chatId: chat.id,
              mittente: 'GUEST',
              canale: 'EMAIL',
              testo,
              letto: false,
            },
          })

          // Aggiorna updatedAt della chat
          await prisma.chat.update({
            where: { id: chat.id },
            data: { updatedAt: new Date() },
          })

          // Segna come letta su IMAP
          await client.messageFlagsAdd(msg.seq, ['\\Seen'], { uid: false })

          processed++
          logger.info('Inbound email processata', 'inbound-email', {
            chatId, from: fromAddr, textLength: testo.length,
          })
        } catch (err) {
          logger.error('Errore processing email', 'inbound-email', {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    } finally {
      lock.release()
    }

    await client.logout()
  } catch (err) {
    logger.error('Errore connessione IMAP', 'inbound-email', {
      error: err instanceof Error ? err.message : String(err),
    })
    try { await client.logout() } catch { /* ignore */ }
  }

  return processed
}

// ─── Webhook Provider (futuro SendGrid/Mailgun) ────────────────────────────

export interface InboundEmailPayload {
  from: string
  subject: string
  text: string
  html?: string
}

/**
 * Processa una email ricevuta via webhook (SendGrid Inbound Parse / Mailgun).
 * Stessa logica del polling IMAP ma con dati già parsati.
 */
export async function processInboundWebhook(payload: InboundEmailPayload): Promise<boolean> {
  const chatId = extractChatId(payload.subject)
  if (!chatId) return false

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      prenotazione: { select: { guestEmail: true } },
    },
  })

  if (!chat) return false

  const fromAddr = payload.from.toLowerCase()
  const guestEmail = chat.prenotazione.guestEmail?.toLowerCase()
  if (!fromAddr.includes(guestEmail ?? '')) return false

  const testo = cleanEmailBody(payload.text || payload.html?.replace(/<[^>]+>/g, ' ') || '')
  if (!testo) return false

  await prisma.messaggio.create({
    data: {
      chatId: chat.id,
      mittente: 'GUEST',
      canale: 'EMAIL',
      testo,
      letto: false,
    },
  })

  await prisma.chat.update({
    where: { id: chat.id },
    data: { updatedAt: new Date() },
  })

  logger.info('Webhook inbound email processata', 'inbound-email', { chatId, from: fromAddr })
  return true
}
