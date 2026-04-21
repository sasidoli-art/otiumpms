import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { revealSecret } from '@/lib/secrets'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe webhook — riceve eventi `checkout.session.completed` e
 * `checkout.session.async_payment_succeeded/failed`.
 *
 * Multi-tenant: ogni host puo` configurare il proprio `STRIPE_WEBHOOK_SECRET`
 * oppure uso fallback `process.env.STRIPE_WEBHOOK_SECRET` (piattaforma).
 * Dato che il webhook non puo` sapere quale host senza parsing: prima parsiamo
 * metadata.hostId dal body, poi verifichiamo la firma con il secret di quel host.
 *
 * Per semplicita` V1: usiamo STRIPE_WEBHOOK_SECRET globale piattaforma.
 * (In Stripe Dashboard configurare 1 endpoint con questo URL.)
 */

interface StripeEventLite {
  id: string
  type: string
  data?: { object?: { id?: string; metadata?: Record<string, string>; payment_status?: string; amount_total?: number; payment_intent?: string } }
}

function verifyStripeSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false
  // Header formato: t=1234567890,v1=signature,v0=...
  const parts: Record<string, string[]> = {}
  for (const seg of header.split(',')) {
    const [k, v] = seg.split('=')
    if (!k || !v) continue
    parts[k] = parts[k] ?? []
    parts[k].push(v)
  }
  const timestamp = parts['t']?.[0]
  const signatures = parts['v1'] ?? []
  if (!timestamp || signatures.length === 0) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')
  return signatures.some((sig) => {
    try { return crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8')) } catch { return false }
  })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sigHeader = req.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET non configurato')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  if (!verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
    logger.warn('Stripe webhook: firma non valida', 'webhooks/stripe')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: StripeEventLite
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  logger.info(`Stripe webhook ${event.type}`, 'webhooks/stripe', { id: event.id })

  const session = event.data?.object
  if (!session?.id) return NextResponse.json({ ok: true, ignored: true })

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const prenotazioneId = session.metadata?.prenotazioneId
      if (!prenotazioneId) break

      await prisma.pagamentoCheckout.updateMany({
        where: { prenotazioneId, riferimentoEsterno: session.id, stato: 'PENDENTE' },
        data: {
          stato: 'COMPLETATO',
          autorizzazione: session.payment_intent ?? null,
        },
      })

      // Se struttura.autoConferma = false ma pagamento online riuscito: conferma automatica
      await prisma.prenotazione.update({
        where: { id: prenotazioneId },
        data: { stato: 'CONFERMATA' },
      }).catch(() => { /* gia` confermata */ })

      await prisma.auditLog.create({
        data: {
          hostId: session.metadata?.hostId ?? null,
          azione: 'pagamento.online.riuscito',
          entita: 'prenotazione',
          entitaId: prenotazioneId,
          dettagli: `Pagamento Stripe ${session.id} completato (€${(session.amount_total ?? 0) / 100})`,
        },
      })
      break
    }
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const prenotazioneId = session.metadata?.prenotazioneId
      if (!prenotazioneId) break

      await prisma.pagamentoCheckout.updateMany({
        where: { prenotazioneId, riferimentoEsterno: session.id, stato: 'PENDENTE' },
        data: {
          stato: event.type === 'checkout.session.expired' ? 'ANNULLATO' : 'RIFIUTATO',
          errore: event.type,
        },
      })
      break
    }
  }

  return NextResponse.json({ ok: true })
}
