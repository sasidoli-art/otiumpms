/**
 * Payment Provider Abstraction Layer
 *
 * Interfaccia unica per processare pagamenti POS.
 * L'host configura il suo provider e le sue credenziali.
 *
 * Provider supportati:
 * - MANUALE: l'operatore registra il pagamento fatto fuori dal sistema
 * - STRIPE: Stripe Terminal API (POS cloud)
 * - ADYEN: Adyen Terminal API (POS cloud/local)
 * - NEXI: predisposto (richiede partnership)
 * - SUMUP: SumUp API (POS cloud)
 */

import { logger } from '@/lib/logger'
import { revealSecret } from '@/lib/secrets'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface PaymentRequest {
  importo: number
  divisa?: string
  riferimento?: string   // ID prenotazione o numero conto
  descrizione?: string   // "Checkout camera 204 — Rossi Mario"
}

export interface PaymentResult {
  success: boolean
  transactionId: string | null
  errore: string | null
  metodo?: string          // CARTA, CONTANTI, ecc.
  circuito?: string        // VISA, MASTERCARD
  ultime4Cifre?: string
  autorizzazione?: string
  raw?: Record<string, unknown>  // risposta originale del provider
}

export interface PaymentProviderConfig {
  providerAttivo: string
  stripeSecretKey?: string | null
  stripeLocationId?: string | null
  stripeReaderId?: string | null
  adyenApiKey?: string | null
  adyenMerchantAccount?: string | null
  adyenTerminalId?: string | null
  adyenEnvironment?: string | null
  sumupApiKey?: string | null
  sumupDeviceId?: string | null
}

export interface PaymentProvider {
  processPayment(req: PaymentRequest): Promise<PaymentResult>
  cancelPayment?(transactionId: string): Promise<boolean>
  getStatus?(): Promise<{ online: boolean; terminale: string }>
}

// ─── Online checkout (Stripe Hosted) ─────────────────────────────────────────
//
// Flusso card-not-present per booking engine / privacy portal / qualsiasi checkout online.
// Crea una Stripe Checkout Session e ritorna l'URL a cui redirigere il browser.
// Lo stato viene aggiornato async dal webhook /api/webhooks/stripe.

export interface OnlineCheckoutRequest {
  hostId: string
  prenotazioneId: string
  importo: number // EUR
  descrizione: string
  successUrl: string
  cancelUrl: string
  guestEmail?: string | null
  // Capture mode: 'automatic' riscuote subito; 'manual' solo autorizza (hold) per no-show policy
  captureMode?: 'automatic' | 'manual'
  // Metadata propagati a webhook
  metadata?: Record<string, string>
}

export interface OnlineCheckoutResult {
  success: boolean
  sessionId: string | null
  sessionUrl: string | null
  errore: string | null
}

/**
 * Crea una Stripe Checkout Session per pagamenti online.
 * Richiede `PaymentProviderConfig.stripeSecretKey` configurata per il host.
 */
export async function createOnlineCheckout(
  stripeSecretKey: string | null | undefined,
  req: OnlineCheckoutRequest,
): Promise<OnlineCheckoutResult> {
  const secret = stripeSecretKey ? (revealSecret(stripeSecretKey) ?? stripeSecretKey) : null
  if (!secret) {
    return { success: false, sessionId: null, sessionUrl: null, errore: 'Stripe non configurato per questo host' }
  }

  try {
    const params = new URLSearchParams()
    params.append('mode', 'payment')
    params.append('success_url', req.successUrl)
    params.append('cancel_url', req.cancelUrl)
    params.append('line_items[0][price_data][currency]', 'eur')
    params.append('line_items[0][price_data][product_data][name]', req.descrizione.slice(0, 200))
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(req.importo * 100)))
    params.append('line_items[0][quantity]', '1')
    if (req.guestEmail) params.append('customer_email', req.guestEmail)
    if (req.captureMode === 'manual') {
      params.append('payment_intent_data[capture_method]', 'manual')
    }
    // Metadata propagati al PaymentIntent/Session
    params.append('metadata[hostId]', req.hostId)
    params.append('metadata[prenotazioneId]', req.prenotazioneId)
    for (const [k, v] of Object.entries(req.metadata ?? {})) {
      params.append(`metadata[${k}]`, v)
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return {
        success: false, sessionId: null, sessionUrl: null,
        errore: err.error?.message || `Stripe HTTP ${res.status}`,
      }
    }

    const session = await res.json()
    return {
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      errore: null,
    }
  } catch (err) {
    logger.error('Stripe Checkout error', { error: String(err) })
    return { success: false, sessionId: null, sessionUrl: null, errore: `Errore Stripe: ${String(err)}` }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createPaymentProvider(config: PaymentProviderConfig): PaymentProvider {
  switch (config.providerAttivo) {
    case 'STRIPE':
      return new StripeTerminalProvider(config)
    case 'ADYEN':
      return new AdyenTerminalProvider(config)
    case 'SUMUP':
      return new SumUpProvider(config)
    case 'MANUALE':
    default:
      return new ManualProvider()
  }
}

// ─── Provider Manuale ─────────────────────────────────────────────────────────

class ManualProvider implements PaymentProvider {
  async processPayment(req: PaymentRequest): Promise<PaymentResult> {
    // Il pagamento è gestito manualmente dall'operatore
    return {
      success: true,
      transactionId: `MAN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      errore: null,
      metodo: 'MANUALE',
    }
  }
}

// ─── Stripe Terminal ──────────────────────────────────────────────────────────

class StripeTerminalProvider implements PaymentProvider {
  private secretKey: string
  private readerId: string

  constructor(config: PaymentProviderConfig) {
    this.secretKey = revealSecret(config.stripeSecretKey) || ''
    this.readerId = config.stripeReaderId || ''
  }

  async processPayment(req: PaymentRequest): Promise<PaymentResult> {
    if (!this.secretKey || !this.readerId) {
      return { success: false, transactionId: null, errore: 'Stripe Terminal non configurato (manca API key o reader ID)' }
    }

    try {
      // 1. Crea PaymentIntent
      const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: String(Math.round(req.importo * 100)), // centesimi
          currency: req.divisa || 'eur',
          'payment_method_types[]': 'card_present',
          capture_method: 'automatic',
          description: req.descrizione || '',
        }),
      })

      if (!piRes.ok) {
        const err = await piRes.json()
        return { success: false, transactionId: null, errore: err.error?.message || 'Errore creazione PaymentIntent' }
      }

      const pi = await piRes.json()

      // 2. Invia al reader per il pagamento
      const ppRes = await fetch(`https://api.stripe.com/v1/terminal/readers/${this.readerId}/process_payment_intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ payment_intent: pi.id }),
      })

      if (!ppRes.ok) {
        const err = await ppRes.json()
        return { success: false, transactionId: pi.id, errore: err.error?.message || 'Errore invio al terminale' }
      }

      const result = await ppRes.json()

      return {
        success: true,
        transactionId: pi.id,
        errore: null,
        metodo: 'CARTA',
        circuito: result.action?.process_payment_intent?.payment_intent?.charges?.data?.[0]?.payment_method_details?.card_present?.brand?.toUpperCase(),
        ultime4Cifre: result.action?.process_payment_intent?.payment_intent?.charges?.data?.[0]?.payment_method_details?.card_present?.last4,
        raw: result,
      }
    } catch (err) {
      logger.error('Stripe Terminal error', { error: String(err) })
      return { success: false, transactionId: null, errore: `Errore Stripe: ${String(err)}` }
    }
  }

  async getStatus(): Promise<{ online: boolean; terminale: string }> {
    try {
      const res = await fetch(`https://api.stripe.com/v1/terminal/readers/${this.readerId}`, {
        headers: { 'Authorization': `Bearer ${this.secretKey}` },
      })
      if (res.ok) {
        const data = await res.json()
        return { online: data.status === 'online', terminale: data.label || this.readerId }
      }
    } catch {}
    return { online: false, terminale: this.readerId }
  }
}

// ─── Adyen Terminal ───────────────────────────────────────────────────────────

class AdyenTerminalProvider implements PaymentProvider {
  private apiKey: string
  private merchantAccount: string
  private terminalId: string
  private baseUrl: string

  constructor(config: PaymentProviderConfig) {
    this.apiKey = revealSecret(config.adyenApiKey) || ''
    this.merchantAccount = config.adyenMerchantAccount || ''
    this.terminalId = config.adyenTerminalId || ''
    this.baseUrl = config.adyenEnvironment === 'live'
      ? 'https://terminal-api-live.adyen.com'
      : 'https://terminal-api-test.adyen.com'
  }

  async processPayment(req: PaymentRequest): Promise<PaymentResult> {
    if (!this.apiKey || !this.terminalId) {
      return { success: false, transactionId: null, errore: 'Adyen non configurato' }
    }

    const serviceId = `OTM${Date.now().toString(36)}`
    const body = {
      SaleToPOIRequest: {
        MessageHeader: {
          ProtocolVersion: '3.0',
          MessageClass: 'Service',
          MessageCategory: 'Payment',
          MessageType: 'Request',
          ServiceID: serviceId,
          SaleID: 'OtiumWeekPMS',
          POIID: this.terminalId,
        },
        PaymentRequest: {
          SaleData: {
            SaleTransactionID: { TransactionID: req.riferimento || serviceId, TimeStamp: new Date().toISOString() },
          },
          PaymentTransaction: {
            AmountsReq: { Currency: req.divisa || 'EUR', RequestedAmount: req.importo },
          },
        },
      },
    }

    try {
      const res = await fetch(`${this.baseUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-API-key': this.apiKey,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        return { success: false, transactionId: serviceId, errore: `Adyen HTTP ${res.status}` }
      }

      const data = await res.json()
      const paymentResult = data.SaleToPOIResponse?.PaymentResponse?.Response?.Result

      return {
        success: paymentResult === 'Success',
        transactionId: serviceId,
        errore: paymentResult !== 'Success' ? (data.SaleToPOIResponse?.PaymentResponse?.Response?.ErrorCondition || 'Pagamento rifiutato') : null,
        metodo: 'CARTA',
        raw: data,
      }
    } catch (err) {
      logger.error('Adyen Terminal error', { error: String(err) })
      return { success: false, transactionId: serviceId, errore: `Errore Adyen: ${String(err)}` }
    }
  }
}

// ─── SumUp ────────────────────────────────────────────────────────────────────

class SumUpProvider implements PaymentProvider {
  private apiKey: string

  constructor(config: PaymentProviderConfig) {
    this.apiKey = revealSecret(config.sumupApiKey) || ''
  }

  async processPayment(req: PaymentRequest): Promise<PaymentResult> {
    if (!this.apiKey) {
      return { success: false, transactionId: null, errore: 'SumUp non configurato' }
    }

    try {
      const res = await fetch('https://api.sumup.com/v0.1/checkouts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkout_reference: req.riferimento || `OTM_${Date.now()}`,
          amount: req.importo,
          currency: req.divisa || 'EUR',
          description: req.descrizione || 'Pagamento Otium Week',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        return { success: false, transactionId: null, errore: err.message || 'Errore SumUp' }
      }

      const data = await res.json()
      return {
        success: true,
        transactionId: data.id,
        errore: null,
        metodo: 'CARTA',
        raw: data,
      }
    } catch (err) {
      return { success: false, transactionId: null, errore: `Errore SumUp: ${String(err)}` }
    }
  }
}
