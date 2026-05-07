import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/whatsapp'
import { verificaWebhook, processaWebhookWhatsApp } from '@/lib/whatsapp-webhook'
import { getWhatsAppConfig } from '@/lib/host-config'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

/**
 * Webhook WhatsApp Meta Cloud API — endpoint per-host.
 *
 *   GET  /api/webhook/whatsapp/[hostId]?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 *   POST /api/webhook/whatsapp/[hostId]   (body = payload Meta, firma in X-Hub-Signature-256)
 *
 * Configurazione Meta:
 *   - "Callback URL" = https://<dominio>/api/webhook/whatsapp/<hostId>
 *   - "Verify Token" = stesso valore salvato in `host.whatsappVerifyToken`
 *
 * Sicurezza:
 *   - GET: verify token plaintext (Host.whatsappVerifyToken, indicizzato)
 *   - POST: firma HMAC-SHA256 con app secret (env `WHATSAPP_APP_SECRET`, platform-wide).
 *     Se l'env non è configurato: log warning e processa comunque (modalita dev/test).
 *
 * Performance:
 *   Meta richiede risposta 200 entro pochi secondi. Il processing AI può essere
 *   lento (2-8s per un turno con tool). Se le latenze diventano un problema,
 *   spostare l'elaborazione in una queue (QStash/Upstash) e restituire subito 200.
 */
export const maxDuration = 30

// ────────────────────────────────────────────────────────────────────────────
// GET — handshake verifica webhook Meta
// ────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ hostId: string }> },
) {
  const { hostId } = await paramsPromise
  const sp = req.nextUrl.searchParams
  const mode = sp.get('hub.mode')
  const token = sp.get('hub.verify_token')
  const challenge = sp.get('hub.challenge')

  const wa = await getWhatsAppConfig(hostId)
  if (!wa?.verifyToken) {
    logger.warn('Webhook WA GET: host senza verifyToken', { hostId })
    return new NextResponse('Host not configured', { status: 404 })
  }

  const result = verificaWebhook(mode, token, challenge, wa.verifyToken)
  if (!result) {
    logger.warn('Webhook WA GET: verifica fallita', { hostId, mode })
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(result, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// POST — ricezione messaggi
// ────────────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ hostId: string }> },
) {
  const { hostId } = await paramsPromise

  // Leggi raw body per verifica firma HMAC
  const rawBody = await req.text()

  // Verifica firma con app secret platform-wide (Meta App Secret)
  const appSecret = process.env.WHATSAPP_APP_SECRET
  const signature = req.headers.get('x-hub-signature-256')
  if (appSecret) {
    const valid = await verifyWebhookSignature(rawBody, signature, appSecret)
    if (!valid) {
      logger.warn('Webhook WA POST: firma non valida', { hostId })
      return new NextResponse('Invalid signature', { status: 401 })
    }
  } else {
    logger.warn('WHATSAPP_APP_SECRET non configurato — firma webhook non verificata', { hostId })
  }

  // Parse JSON dopo aver letto testo per firma
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  // Processa in modo sincrono ma con cattura errori — Meta riproverà se non 200.
  // IMPORTANTE: se il processing supera il tempo di risposta richiesto da Meta,
  // spostare in coda asincrona (vedi commento in cima al file).
  try {
    const result = await processaWebhookWhatsApp(
      payload as Parameters<typeof processaWebhookWhatsApp>[0],
      hostId,
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error('Webhook WA POST: processing errore', { hostId, error: errMsg })
    Sentry.captureException(err, { tags: { route: 'webhook/whatsapp', hostId } })
    // Rispondi 200 comunque — altrimenti Meta riproverà indefinitamente lo stesso
    // messaggio e aggraverebbe l'errore. Meglio loggare e continuare.
    return NextResponse.json({ ok: false, error: 'processing failed' })
  }
}
