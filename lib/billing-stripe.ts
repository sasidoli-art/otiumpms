/**
 * Stripe Subscription integration (placeholder).
 *
 * Interfaccia pronta per quando si attiveranno i pagamenti ricorrenti.
 * V1: tutte le funzioni ritornano mock + loggano TODO.
 *
 * Per attivare:
 *   1. npm install stripe
 *   2. Env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_<PIANO>, STRIPE_WEBHOOK_SECRET
 *   3. Implementa le funzioni sotto chiamando la libreria Stripe
 *   4. Configura i prezzi Stripe Dashboard corrispondenti a PLAN_DEFINITIONS
 *   5. Webhook endpoint /api/webhooks/stripe gia` predisposto per Checkout
 *      (una-tantum) — va esteso per eventi customer.subscription.*
 */

import { logger } from '@/lib/logger'
import type { PianoTipo } from '@prisma/client'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface CreateSubscriptionParams {
  hostId: string
  planId: PianoTipo
  /** Opzionale: trial giorni (es. 14 per nuovi signup) */
  trialDays?: number
  /** Email del payer (di default user.email del host) */
  customerEmail?: string
}

export interface SubscriptionResult {
  success: boolean
  subscriptionId: string | null
  customerId: string | null
  clientSecret: string | null // per Stripe Elements setup
  errore?: string
}

export interface UpdatePlanParams {
  hostId: string
  newPlanId: PianoTipo
  /** Se true, la modifica parte dal prossimo ciclo; false = proration immediato */
  effectiveAtPeriodEnd?: boolean
}

export interface CancelSubscriptionParams {
  hostId: string
  /** true = stop fatturazione fine periodo; false = cancella subito e rimborsa prorate */
  atPeriodEnd?: boolean
  motivo?: string
}

export interface StripeWebhookEvent {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

// ─── Placeholder API ──────────────────────────────────────────────────────────

/**
 * Crea un Customer + Subscription Stripe per un host.
 * V1: mock. Produzione: usa `stripe.customers.create` + `stripe.subscriptions.create`.
 */
export async function createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
  logger.info('TODO: createSubscription Stripe', 'billing-stripe', params)
  return {
    success: false,
    subscriptionId: null,
    customerId: null,
    clientSecret: null,
    errore: 'Stripe Subscription non ancora configurato (placeholder). Registrare pagamenti manualmente.',
  }
}

/** Aggiorna piano di un subscription esistente. */
export async function updatePlan(params: UpdatePlanParams): Promise<SubscriptionResult> {
  logger.info('TODO: updatePlan Stripe', 'billing-stripe', params)
  return {
    success: false,
    subscriptionId: null,
    customerId: null,
    clientSecret: null,
    errore: 'Stripe Subscription non ancora configurato (placeholder)',
  }
}

/** Cancella un subscription (default: fine periodo corrente). */
export async function cancelSubscription(params: CancelSubscriptionParams): Promise<SubscriptionResult> {
  logger.info('TODO: cancelSubscription Stripe', 'billing-stripe', params)
  return {
    success: false,
    subscriptionId: null,
    customerId: null,
    clientSecret: null,
    errore: 'Stripe Subscription non ancora configurato (placeholder)',
  }
}

/**
 * Gestisce un webhook event Stripe.
 * Eventi supportati (quando implementati):
 *   - customer.subscription.created → imposta Host.dataInizioAbb
 *   - customer.subscription.updated → aggiorna piano/stato
 *   - customer.subscription.deleted → Host.statoAbbonamento = SCADUTO
 *   - invoice.payment_succeeded → crea PagamentoPiattaforma PAGATO
 *   - invoice.payment_failed → notifica SUPERADMIN + PagamentoPiattaforma FALLITO
 */
export async function handleWebhook(event: StripeWebhookEvent): Promise<{ handled: boolean }> {
  logger.info('TODO: handleWebhook Stripe', 'billing-stripe', { type: event.type, id: event.id })
  return { handled: false }
}

/**
 * Helper: mappa PianoTipo → Stripe Price ID (da configurare in env).
 */
export function getStripePriceId(piano: PianoTipo): string | null {
  const map: Record<PianoTipo, string | undefined> = {
    LIGHT: process.env.STRIPE_PRICE_ID_LIGHT,
    EVENTO_SINGOLO: process.env.STRIPE_PRICE_ID_EVENTO,
    VISIBILITA_MENSILE: process.env.STRIPE_PRICE_ID_VISIBILITA,
    PARTNER_PREMIUM: process.env.STRIPE_PRICE_ID_PARTNER,
  }
  return map[piano] ?? null
}
