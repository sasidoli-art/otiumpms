/**
 * lib/stripe.ts — facade per le operazioni Stripe SaaS (abbonamenti host).
 *
 * NON usa il package `stripe` npm: chiamate REST dirette per evitare bloat
 * e mantenere il bundle leggero. Stessa strategia di `/api/host/abbonamento/portal`
 * (gia` in produzione).
 *
 * Endpoint coperti:
 *   - GET    /v1/customers (lookup by metadata.hostId)
 *   - POST   /v1/customers (create + link a Host)
 *   - POST   /v1/checkout/sessions (subscription mode)
 *   - POST   /v1/billing_portal/sessions
 *   - POST   /v1/subscriptions/{id} (update plan)
 *   - DELETE /v1/subscriptions/{id} (cancel at period end)
 *
 * Per attivare in prod servono:
 *   - STRIPE_SECRET_KEY (live: sk_live_...)
 *   - STRIPE_WEBHOOK_SECRET (per /api/webhooks/stripe)
 *   - 4 piani × 2 frequenze = 8 STRIPE_PRICE_* env vars
 */
import { prisma } from './db'
import type { PianoTipo, Host } from '@prisma/client'

const STRIPE_API = 'https://api.stripe.com/v1'

// ───────────────────────────────────────────────────────────────────────────
// Price IDs map (env-driven, per evitare hardcoding)
// ───────────────────────────────────────────────────────────────────────────

export type Periodo = 'monthly' | 'yearly'

function getPriceId(piano: PianoTipo, periodo: Periodo): string | null {
  // Naming env: STRIPE_PRICE_{PIANO}_{PERIODO}
  // es. STRIPE_PRICE_PARTNER_PREMIUM_MONTHLY
  const key = `STRIPE_PRICE_${piano}_${periodo.toUpperCase()}` as const
  return process.env[key] ?? null
}

// ───────────────────────────────────────────────────────────────────────────
// HTTP helper
// ───────────────────────────────────────────────────────────────────────────

class StripeError extends Error {
  status: number
  raw: unknown
  constructor(message: string, status: number, raw: unknown) {
    super(message)
    this.status = status
    this.raw = raw
  }
}

async function stripeRequest<T = unknown>(
  path: string,
  init: { method: 'GET' | 'POST' | 'DELETE'; body?: URLSearchParams } = { method: 'GET' },
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new StripeError('STRIPE_SECRET_KEY non configurato', 503, null)

  const res = await fetch(`${STRIPE_API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20',
    },
    body: init.body?.toString(),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new StripeError(
      (data as { error?: { message?: string } }).error?.message ?? `Stripe ${res.status}`,
      res.status,
      data,
    )
  }
  return data as T
}

// ───────────────────────────────────────────────────────────────────────────
// Customer management
// ───────────────────────────────────────────────────────────────────────────

interface StripeCustomer {
  id: string
  email?: string
  name?: string
}

/**
 * Crea o recupera il customer Stripe per un host. Se Host.stripeCustomerId
 * esiste e` valido, lo riutilizza; altrimenti crea un nuovo customer e
 * aggiorna l'host.
 */
export async function getOrCreateStripeCustomer(host: Pick<Host, 'id' | 'stripeCustomerId' | 'nomeAzienda' | 'partitaIva'> & { email: string }): Promise<string> {
  if (host.stripeCustomerId) {
    // Verifica che esista ancora su Stripe (potrebbe essere stato cancellato)
    try {
      await stripeRequest<StripeCustomer>(`/customers/${host.stripeCustomerId}`)
      return host.stripeCustomerId
    } catch (err) {
      if (err instanceof StripeError && err.status === 404) {
        // Customer cancellato su Stripe — ricrealo
      } else {
        throw err
      }
    }
  }

  const params = new URLSearchParams()
  params.set('email', host.email)
  params.set('name', host.nomeAzienda)
  params.set('metadata[hostId]', host.id)
  if (host.partitaIva) params.set('metadata[partitaIva]', host.partitaIva)

  const customer = await stripeRequest<StripeCustomer>('/customers', { method: 'POST', body: params })

  await prisma.host.update({
    where: { id: host.id },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}

// ───────────────────────────────────────────────────────────────────────────
// Checkout session (subscription)
// ───────────────────────────────────────────────────────────────────────────

interface StripeSession {
  id: string
  url: string
}

export interface CreateCheckoutParams {
  hostId: string
  hostEmail: string
  hostNomeAzienda: string
  hostPartitaIva?: string | null
  hostStripeCustomerId?: string | null
  piano: PianoTipo
  periodo: Periodo
  successUrl: string
  cancelUrl: string
  trialDays?: number
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string; sessionId: string }> {
  const priceId = getPriceId(params.piano, params.periodo)
  if (!priceId) {
    throw new StripeError(`Price ID non configurato per ${params.piano}/${params.periodo}`, 500, null)
  }

  const customerId = await getOrCreateStripeCustomer({
    id: params.hostId,
    stripeCustomerId: params.hostStripeCustomerId ?? null,
    nomeAzienda: params.hostNomeAzienda,
    partitaIva: params.hostPartitaIva ?? null,
    email: params.hostEmail,
  })

  const body = new URLSearchParams()
  body.set('customer', customerId)
  body.set('mode', 'subscription')
  body.append('payment_method_types[]', 'card')
  body.append('payment_method_types[]', 'sepa_debit')
  body.set('line_items[0][price]', priceId)
  body.set('line_items[0][quantity]', '1')
  body.set('success_url', `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`)
  body.set('cancel_url', params.cancelUrl)
  body.set('metadata[hostId]', params.hostId)
  body.set('metadata[piano]', params.piano)
  body.set('metadata[periodo]', params.periodo)
  body.set('subscription_data[metadata][hostId]', params.hostId)
  body.set('subscription_data[metadata][piano]', params.piano)
  if (params.trialDays && params.trialDays > 0) {
    body.set('subscription_data[trial_period_days]', String(params.trialDays))
  }
  body.set('tax_id_collection[enabled]', 'true')
  body.set('locale', 'it')
  body.set('allow_promotion_codes', 'true')

  const session = await stripeRequest<StripeSession>('/checkout/sessions', { method: 'POST', body })
  return { url: session.url, sessionId: session.id }
}

// ───────────────────────────────────────────────────────────────────────────
// Billing portal
// ───────────────────────────────────────────────────────────────────────────

export async function createPortalSession(stripeCustomerId: string, returnUrl: string): Promise<string> {
  const body = new URLSearchParams()
  body.set('customer', stripeCustomerId)
  body.set('return_url', returnUrl)
  const session = await stripeRequest<{ url: string }>('/billing_portal/sessions', { method: 'POST', body })
  return session.url
}

// ───────────────────────────────────────────────────────────────────────────
// Subscription updates
// ───────────────────────────────────────────────────────────────────────────

interface StripeSubscriptionItem { id: string }
interface StripeSubscription {
  id: string
  status: string
  cancel_at_period_end: boolean
  current_period_end: number
  items: { data: StripeSubscriptionItem[] }
}

/**
 * Cambio piano (proration immediato per default).
 * Per cambiare il prezzo bisogna aggiornare l'item esistente, non aggiungerne un altro.
 */
export async function changePlan(
  subscriptionId: string,
  newPiano: PianoTipo,
  periodo: Periodo,
): Promise<void> {
  const sub = await stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`)
  const itemId = sub.items.data[0]?.id
  if (!itemId) throw new StripeError('Subscription senza items', 500, sub)

  const newPriceId = getPriceId(newPiano, periodo)
  if (!newPriceId) throw new StripeError(`Price ID non configurato per ${newPiano}/${periodo}`, 500, null)

  const body = new URLSearchParams()
  body.set('items[0][id]', itemId)
  body.set('items[0][price]', newPriceId)
  body.set('proration_behavior', 'create_prorations')
  body.set('metadata[piano]', newPiano)

  await stripeRequest(`/subscriptions/${subscriptionId}`, { method: 'POST', body })
}

/**
 * Cancella la subscription alla fine del periodo corrente (no rimborso, l'host
 * mantiene accesso fino a expiry). Per cancellazione immediata: deleteSubscription.
 */
export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<void> {
  const body = new URLSearchParams()
  body.set('cancel_at_period_end', 'true')
  await stripeRequest(`/subscriptions/${subscriptionId}`, { method: 'POST', body })
}

/**
 * Cancella la subscription IMMEDIATAMENTE (per casi estremi: violazione T&C,
 * frode). L'accesso viene revocato subito.
 */
export async function deleteSubscriptionImmediately(subscriptionId: string): Promise<void> {
  await stripeRequest(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
}

export { StripeError }
