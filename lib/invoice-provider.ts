/**
 * Provider abstraction for Italian electronic invoicing (SDI).
 *
 * Supports multiple backends for sending FatturaPA XML to the
 * Sistema di Interscambio (SDI):
 *   - ManualProvider: no-op, host downloads XML and uploads manually
 *   - ArubaProvider: Aruba Fatturazione Elettronica API
 *   - FattureInCloudProvider: FattureInCloud API v2
 *
 * Usage:
 *   const provider = getInvoiceProvider({ provider: 'aruba', apiKey: '...' })
 *   const result = await provider.sendInvoice(xml, filename)
 */

import { logger } from '@/lib/logger'

// ─── Interface ───────────────────────────────────────────────────────────────

export type SdiStato = 'accettata' | 'scartata' | 'in_attesa'

export interface SendInvoiceResult {
  id: string
  status: string
}

export interface CheckStatusResult {
  status: SdiStato
  message?: string
}

export interface InvoiceProvider {
  name: string
  sendInvoice(xml: string, filename: string): Promise<SendInvoiceResult>
  checkStatus(id: string): Promise<CheckStatusResult>
  downloadReceipt(id: string): Promise<Buffer | null>
}

// ─── Manual Provider (default) ───────────────────────────────────────────────

class ManualProvider implements InvoiceProvider {
  name = 'manuale'

  async sendInvoice(_xml: string, filename: string): Promise<SendInvoiceResult> {
    // No-op: host downloads XML manually from the platform
    logger.info(`[ManualProvider] Fattura ${filename} pronta per download manuale`)
    return {
      id: `manual_${Date.now()}`,
      status: 'manual_download',
    }
  }

  async checkStatus(_id: string): Promise<CheckStatusResult> {
    // Manual provider cannot check status
    return { status: 'in_attesa', message: 'Invio manuale — controllare lo stato sul portale SDI' }
  }

  async downloadReceipt(_id: string): Promise<Buffer | null> {
    return null
  }
}

// ─── Aruba Provider ──────────────────────────────────────────────────────────

class ArubaProvider implements InvoiceProvider {
  name = 'aruba'
  private apiKey: string
  private username: string
  private baseUrl = 'https://fatturazioneelettronica.aruba.it/services/invoice/v2'

  constructor(apiKey: string, username: string) {
    this.apiKey = apiKey
    this.username = username
  }

  async sendInvoice(xml: string, filename: string): Promise<SendInvoiceResult> {
    const xmlBase64 = Buffer.from(xml, 'utf-8').toString('base64')

    const res = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        dataFile: xmlBase64,
        credential: this.username,
        domain: 'fatturapa',
        filename,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      logger.error(`[ArubaProvider] Errore invio fattura: ${res.status} — ${errorText}`)
      throw new Error(`Aruba API error: ${res.status} — ${errorText}`)
    }

    const data = await res.json() as { uploadFileName?: string; idSdi?: string }
    logger.info(`[ArubaProvider] Fattura ${filename} inviata — ID: ${data.uploadFileName || data.idSdi}`)

    return {
      id: data.uploadFileName || data.idSdi || `aruba_${Date.now()}`,
      status: 'inviata',
    }
  }

  async checkStatus(id: string): Promise<CheckStatusResult> {
    const res = await fetch(`${this.baseUrl}/invoice/status?filename=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!res.ok) {
      logger.error(`[ArubaProvider] Errore verifica stato: ${res.status}`)
      return { status: 'in_attesa', message: `Errore verifica: HTTP ${res.status}` }
    }

    const data = await res.json() as { status?: string; description?: string }

    const statusMap: Record<string, SdiStato> = {
      'ACCEPTED': 'accettata',
      'DELIVERED': 'accettata',
      'REJECTED': 'scartata',
      'FAILED': 'scartata',
      'PENDING': 'in_attesa',
      'PROCESSING': 'in_attesa',
    }

    const stato = statusMap[data.status || ''] || 'in_attesa'
    return { status: stato, message: data.description }
  }

  async downloadReceipt(id: string): Promise<Buffer | null> {
    const res = await fetch(`${this.baseUrl}/invoice/receipt?filename=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!res.ok) return null

    const data = await res.json() as { file?: string }
    if (!data.file) return null

    return Buffer.from(data.file, 'base64')
  }
}

// ─── FattureInCloud Provider ─────────────────────────────────────────────────

class FattureInCloudProvider implements InvoiceProvider {
  name = 'fattureincloud'
  private apiKey: string
  private companyId: string
  private baseUrl = 'https://api-v2.fattureincloud.it'

  constructor(apiKey: string, companyId: string) {
    this.apiKey = apiKey
    this.companyId = companyId
  }

  async sendInvoice(xml: string, filename: string): Promise<SendInvoiceResult> {
    const xmlBase64 = Buffer.from(xml, 'utf-8').toString('base64')

    // FattureInCloud v2: upload pre-compiled XML as e-invoice
    const res = await fetch(`${this.baseUrl}/c/${this.companyId}/issued_e_invoices/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        data: {
          filename,
          xml: xmlBase64,
        },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      logger.error(`[FattureInCloudProvider] Errore invio: ${res.status} — ${errorText}`)
      throw new Error(`FattureInCloud API error: ${res.status} — ${errorText}`)
    }

    const data = await res.json() as { data?: { id?: number; status?: string } }
    const invoiceId = String(data.data?.id || `fic_${Date.now()}`)
    logger.info(`[FattureInCloudProvider] Fattura ${filename} inviata — ID: ${invoiceId}`)

    return {
      id: invoiceId,
      status: data.data?.status || 'inviata',
    }
  }

  async checkStatus(id: string): Promise<CheckStatusResult> {
    const res = await fetch(`${this.baseUrl}/c/${this.companyId}/issued_e_invoices/${id}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!res.ok) {
      logger.error(`[FattureInCloudProvider] Errore verifica stato: ${res.status}`)
      return { status: 'in_attesa', message: `Errore verifica: HTTP ${res.status}` }
    }

    const data = await res.json() as { data?: { status?: string; message?: string } }

    const statusMap: Record<string, SdiStato> = {
      'accepted': 'accettata',
      'delivered': 'accettata',
      'rejected': 'scartata',
      'not_sent': 'in_attesa',
      'sent': 'in_attesa',
      'pending': 'in_attesa',
    }

    const stato = statusMap[data.data?.status || ''] || 'in_attesa'
    return { status: stato, message: data.data?.message }
  }

  async downloadReceipt(id: string): Promise<Buffer | null> {
    const res = await fetch(`${this.baseUrl}/c/${this.companyId}/issued_e_invoices/${id}/receipt`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!res.ok) return null

    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export interface ProviderConfig {
  provider: string
  apiKey?: string
  username?: string
  companyId?: string
}

/**
 * Returns the appropriate InvoiceProvider based on host configuration.
 *
 * Falls back to ManualProvider if config is missing or invalid.
 */
export function getInvoiceProvider(config: ProviderConfig): InvoiceProvider {
  switch (config.provider) {
    case 'aruba': {
      const apiKey = config.apiKey || process.env.ARUBA_API_KEY
      const username = config.username || process.env.ARUBA_USERNAME
      if (!apiKey || !username) {
        logger.warn('[getInvoiceProvider] Aruba config incompleta — fallback a manuale')
        return new ManualProvider()
      }
      return new ArubaProvider(apiKey, username)
    }

    case 'fattureincloud': {
      const apiKey = config.apiKey || process.env.FIC_API_KEY
      const companyId = config.companyId || process.env.FIC_COMPANY_ID
      if (!apiKey || !companyId) {
        logger.warn('[getInvoiceProvider] FattureInCloud config incompleta — fallback a manuale')
        return new ManualProvider()
      }
      return new FattureInCloudProvider(apiKey, companyId)
    }

    default:
      return new ManualProvider()
  }
}
