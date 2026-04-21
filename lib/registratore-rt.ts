/**
 * Registratore Telematico (RT) — astrazione per stampanti fiscali italiane.
 *
 * Implementa il pattern provider: ogni host configura il proprio modello RT
 * (`RegistratoreRtConfig.provider`) e il layer sottostante gestisce
 * la comunicazione (ePos-Print XML per Epson, XML/HTTP per Custom, ecc).
 *
 * V1 implementa solo MANUALE (salva in DB senza hardware).
 * Gli altri provider hanno interfaccia predisposta ma ritornano errore "not implemented".
 */

import { logger } from '@/lib/logger'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export type MetodoPagamentoRT = 'CARTA' | 'CONTANTI' | 'ELETTRONICO' | 'MISTO'

export interface RigaScontrino {
  descrizione: string
  quantita: number
  prezzoUnitario: number
  aliquotaIva: number // percentuale
}

export interface ScontrinoRequest {
  righe: RigaScontrino[]
  metodoPagamento: MetodoPagamentoRT
  clienteFiscale?: string // codice fiscale cliente per scontrino parlante
  note?: string
}

export interface ScontrinoResult {
  success: boolean
  numeroScontrino: string | null
  matricolaRt: string | null
  totale: number
  imponibile: number
  imposta: number
  xml?: string
  errore?: string
}

export interface RtConfig {
  provider: string
  matricola?: string | null
  endpointUrl?: string | null
  timeout?: number
  esercizioNumero?: number | null
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createRtProvider(config: RtConfig): RtProvider {
  switch (config.provider) {
    case 'EPSON_EPOS':
      return new EpsonEposProvider(config)
    case 'CUSTOM_KUBE':
      return new CustomKubeProvider(config)
    case 'OLIVETTI':
      return new OlivettiProvider(config)
    case 'RCH':
      return new RchProvider(config)
    case 'MANUALE':
      return new ManualProvider(config)
    case 'NESSUNO':
    default:
      return new NoopProvider()
  }
}

export interface RtProvider {
  emettiScontrino(req: ScontrinoRequest): Promise<ScontrinoResult>
  /** Trasmette/chiude turno fiscale — richiesto ogni giorno a fine lavoro */
  chiuderaFiscale?(): Promise<{ success: boolean; errore?: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcolaTotali(righe: RigaScontrino[]) {
  let imponibile = 0
  let imposta = 0
  for (const r of righe) {
    const tot = r.quantita * r.prezzoUnitario
    const iva = tot * (r.aliquotaIva / 100)
    imponibile += tot
    imposta += iva
  }
  const r2 = (n: number) => Math.round(n * 100) / 100
  return {
    imponibile: r2(imponibile),
    imposta: r2(imposta),
    totale: r2(imponibile + imposta),
  }
}

// ─── Noop ─────────────────────────────────────────────────────────────────────

class NoopProvider implements RtProvider {
  async emettiScontrino(): Promise<ScontrinoResult> {
    return {
      success: false,
      numeroScontrino: null,
      matricolaRt: null,
      totale: 0, imponibile: 0, imposta: 0,
      errore: 'RT non configurato. Configura un provider in impostazioni.',
    }
  }
}

// ─── Manuale (senza hardware) ─────────────────────────────────────────────────

class ManualProvider implements RtProvider {
  constructor(private config: RtConfig) {}

  async emettiScontrino(req: ScontrinoRequest): Promise<ScontrinoResult> {
    const totali = calcolaTotali(req.righe)
    const numero = `MAN-${Date.now().toString().slice(-10)}`
    return {
      success: true,
      numeroScontrino: numero,
      matricolaRt: this.config.matricola ?? null,
      ...totali,
    }
  }
}

// ─── Epson ePos-Print XML ─────────────────────────────────────────────────────
// Endpoint tipico: http://<IP-STAMPANTE>/cgi-bin/fpmate.cgi
// Protocollo: XML sopra HTTP POST. La stampante risponde con XML ReceiptNumber + MatricolaRegistratore.

class EpsonEposProvider implements RtProvider {
  constructor(private config: RtConfig) {}

  async emettiScontrino(req: ScontrinoRequest): Promise<ScontrinoResult> {
    if (!this.config.endpointUrl) {
      return noopResult(req.righe, 'Endpoint Epson non configurato')
    }
    const totali = calcolaTotali(req.righe)

    // ePos-Print XML (versione semplificata)
    // Docs: https://reference.epson-biz.com/modules/ref_epos-print_en/
    const xml = buildEpsonXml(req)

    try {
      const res = await fetch(this.config.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '""',
        },
        body: xml,
        signal: AbortSignal.timeout(this.config.timeout ?? 10000),
      })

      if (!res.ok) {
        return { success: false, numeroScontrino: null, matricolaRt: null, ...totali, errore: `HTTP ${res.status}` }
      }

      const responseXml = await res.text()
      const numeroMatch = responseXml.match(/ReceiptNumber[^>]*>(\d+)/i)
      const matricolaMatch = responseXml.match(/PrinterSerialNumber[^>]*>([^<]+)/i)

      return {
        success: true,
        numeroScontrino: numeroMatch?.[1] ?? null,
        matricolaRt: matricolaMatch?.[1] ?? this.config.matricola ?? null,
        ...totali,
        xml: responseXml,
      }
    } catch (err) {
      logger.error('Epson RT error', { error: String(err) })
      return { success: false, numeroScontrino: null, matricolaRt: null, ...totali, errore: String(err) }
    }
  }
}

function buildEpsonXml(req: ScontrinoRequest): string {
  const items = req.righe.map((r) => `
        <printRecItem description="${escXml(r.descrizione)}"
          quantity="${r.quantita}"
          unitPrice="${r.prezzoUnitario.toFixed(2)}"
          department="${mapAliquotaToDepartment(r.aliquotaIva)}"
          justification="1" />`).join('')

  const pagamento = req.metodoPagamento === 'CONTANTI' ? '0'
    : req.metodoPagamento === 'ELETTRONICO' ? '2'
    : '1' // carta

  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <printerFiscalReceipt>
      <beginFiscalReceipt />
      ${items}
      <printRecTotal description="TOTALE" paymentType="${pagamento}" />
      <endFiscalReceipt />
    </printerFiscalReceipt>
  </s:Body>
</s:Envelope>`
}

function mapAliquotaToDepartment(aliquota: number): number {
  // Mapping tipico Epson (da configurare nel RT):
  // reparto 1 = 22%, 2 = 10%, 3 = 4%, 4 = 5%, 5 = esente
  if (aliquota === 22) return 1
  if (aliquota === 10) return 2
  if (aliquota === 4) return 3
  if (aliquota === 5) return 4
  return 5
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function noopResult(righe: RigaScontrino[], errore: string): ScontrinoResult {
  const t = calcolaTotali(righe)
  return { success: false, numeroScontrino: null, matricolaRt: null, ...t, errore }
}

// ─── Custom KUBE / Olivetti / RCH — predisposti, TODO ─────────────────────────

class CustomKubeProvider implements RtProvider {
  constructor(private config: RtConfig) {}
  async emettiScontrino(req: ScontrinoRequest): Promise<ScontrinoResult> {
    return noopResult(req.righe, 'Custom KUBE: integrazione da implementare (XML via HTTP)')
  }
}
class OlivettiProvider implements RtProvider {
  constructor(private config: RtConfig) {}
  async emettiScontrino(req: ScontrinoRequest): Promise<ScontrinoResult> {
    return noopResult(req.righe, 'Olivetti: integrazione da implementare (driver proprietario)')
  }
}
class RchProvider implements RtProvider {
  constructor(private config: RtConfig) {}
  async emettiScontrino(req: ScontrinoRequest): Promise<ScontrinoResult> {
    return noopResult(req.righe, 'RCH: integrazione da implementare (protocollo FPrint)')
  }
}
