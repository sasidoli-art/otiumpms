import { prisma } from '@/lib/db'
import { getBillingInfo } from '@/lib/host-config'

/**
 * Generatore XML FatturaPA (Fattura Elettronica italiana)
 *
 * Conforme al tracciato FatturaPA v1.2.2 (Agenzia delle Entrate)
 * Formato: FatturaElettronica XML per invio tramite SDI
 *
 * Struttura:
 *   FatturaElettronicaHeader
 *     ├── DatiTrasmissione (progressivo, codice destinatario)
 *     ├── CedentePrestatore (chi emette: l'hotel)
 *     └── CessionarioCommittente (chi riceve: il cliente)
 *   FatturaElettronicaBody
 *     ├── DatiGenerali (numero, data, tipo documento)
 *     ├── DatiBeniServizi
 *     │   ├── DettaglioLinee (righe fattura)
 *     │   └── DatiRiepilogo (riepilogo IVA)
 *     └── DatiPagamento
 */

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface DatiEmittente {
  denominazione: string
  partitaIva: string
  codiceFiscale?: string
  regimeFiscale: string       // RF01=Ordinario, RF02=Minimi, ecc.
  indirizzo: string
  cap: string
  comune: string
  provincia: string
  nazione?: string            // default IT
}

export interface DatiCliente {
  denominazione?: string      // per aziende
  nome?: string               // per privati
  cognome?: string
  partitaIva?: string         // se azienda
  codiceFiscale?: string
  indirizzo?: string
  cap?: string
  comune?: string
  provincia?: string
  nazione?: string            // default IT
  pec?: string
  codiceSDI?: string          // 7 caratteri, default "0000000"
}

export interface RigaFattura {
  descrizione: string
  quantita: number
  prezzoUnitario: number
  aliquotaIva: number         // es. 22, 10, 4, 0
  natura?: string             // se IVA=0: N1=escluse, N2=non soggette, N4=esenti, ecc.
}

export interface DatiFattura {
  // Trasmissione
  progressivoInvio: string    // es. "00001"
  // Documento
  numero: string              // es. "2026/001"
  data: string                // YYYY-MM-DD
  tipoDocumento?: string      // TD01=fattura, TD04=nota credito
  divisa?: string             // default EUR
  // Dati
  emittente: DatiEmittente
  cliente: DatiCliente
  righe: RigaFattura[]
  // Pagamento
  metodoPagamento?: string    // MP01=contanti, MP05=bonifico, MP08=carta
  dataScadenza?: string       // YYYY-MM-DD
  importoPagamento?: number
  ibanPagamento?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function tag(name: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return ''
  return `<${name}>${esc(String(value))}</${name}>`
}

function fmt2(n: number): string {
  return n.toFixed(2)
}

// ─── Generatore ───────────────────────────────────────────────────────────────

export function generateFatturaPA(dati: DatiFattura): string {
  const e = dati.emittente
  const c = dati.cliente
  const tipoDoc = dati.tipoDocumento || 'TD01'
  const divisa = dati.divisa || 'EUR'

  // Determina formato trasmissione: FPA12 (verso PA) o FPR12 (verso privati)
  const isPA = c.codiceSDI && c.codiceSDI.length === 6
  const formatoTrasmissione = isPA ? 'FPA12' : 'FPR12'
  const codDestinatario = c.codiceSDI || '0000000'

  // Calcolo righe e riepilogo IVA
  const righeXml: string[] = []
  const riepilogoIva: Record<string, { imponibile: number; imposta: number; aliquota: number; natura?: string }> = {}

  dati.righe.forEach((r, i) => {
    const totaleRiga = r.quantita * r.prezzoUnitario
    const key = `${r.aliquotaIva}_${r.natura || ''}`
    if (!riepilogoIva[key]) {
      riepilogoIva[key] = { imponibile: 0, imposta: 0, aliquota: r.aliquotaIva, natura: r.natura }
    }
    riepilogoIva[key].imponibile += totaleRiga
    riepilogoIva[key].imposta += totaleRiga * (r.aliquotaIva / 100)

    righeXml.push(`
        <DettaglioLinee>
          ${tag('NumeroLinea', i + 1)}
          ${tag('Descrizione', r.descrizione)}
          ${tag('Quantita', fmt2(r.quantita))}
          ${tag('PrezzoUnitario', fmt2(r.prezzoUnitario))}
          ${tag('PrezzoTotale', fmt2(totaleRiga))}
          ${tag('AliquotaIVA', fmt2(r.aliquotaIva))}
          ${r.natura ? tag('Natura', r.natura) : ''}
        </DettaglioLinee>`)
  })

  const riepilogoXml: string[] = []
  let importoTotale = 0

  for (const r of Object.values(riepilogoIva)) {
    const imponibile = Math.round(r.imponibile * 100) / 100
    const imposta = Math.round(r.imposta * 100) / 100
    importoTotale += imponibile + imposta

    riepilogoXml.push(`
        <DatiRiepilogo>
          ${tag('AliquotaIVA', fmt2(r.aliquota))}
          ${r.natura ? tag('Natura', r.natura) : ''}
          ${tag('ImponibileImporto', fmt2(imponibile))}
          ${tag('Imposta', fmt2(imposta))}
          ${tag('EsigibilitaIVA', 'I')}
        </DatiRiepilogo>`)
  }

  importoTotale = Math.round(importoTotale * 100) / 100

  // Cliente: persona fisica o giuridica
  let anagraficaCliente = ''
  if (c.denominazione) {
    anagraficaCliente = tag('Denominazione', c.denominazione)
  } else {
    anagraficaCliente = `${tag('Nome', c.nome)}${tag('Cognome', c.cognome)}`
  }

  // Pagamento
  let pagamentoXml = ''
  if (dati.metodoPagamento || dati.dataScadenza) {
    pagamentoXml = `
      <DatiPagamento>
        ${tag('CondizioniPagamento', 'TP02')}
        <DettaglioPagamento>
          ${tag('ModalitaPagamento', dati.metodoPagamento || 'MP05')}
          ${tag('DataScadenzaPagamento', dati.dataScadenza)}
          ${tag('ImportoPagamento', fmt2(dati.importoPagamento ?? importoTotale))}
          ${dati.ibanPagamento ? tag('IBAN', dati.ibanPagamento) : ''}
        </DettaglioPagamento>
      </DatiPagamento>`
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="${formatoTrasmissione}"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2.2/Schema_del_file_xml_FatturaPA_v1.2.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        ${tag('IdPaese', e.nazione || 'IT')}
        ${tag('IdCodice', e.partitaIva)}
      </IdTrasmittente>
      ${tag('ProgressivoInvio', dati.progressivoInvio)}
      ${tag('FormatoTrasmissione', formatoTrasmissione)}
      ${tag('CodiceDestinatario', codDestinatario)}
      ${c.pec ? `<PECDestinatario>${esc(c.pec)}</PECDestinatario>` : ''}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          ${tag('IdPaese', e.nazione || 'IT')}
          ${tag('IdCodice', e.partitaIva)}
        </IdFiscaleIVA>
        ${e.codiceFiscale ? tag('CodiceFiscale', e.codiceFiscale) : ''}
        <Anagrafica>
          ${tag('Denominazione', e.denominazione)}
        </Anagrafica>
        ${tag('RegimeFiscale', e.regimeFiscale)}
      </DatiAnagrafici>
      <Sede>
        ${tag('Indirizzo', e.indirizzo)}
        ${tag('CAP', e.cap)}
        ${tag('Comune', e.comune)}
        ${tag('Provincia', e.provincia)}
        ${tag('Nazione', e.nazione || 'IT')}
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${c.partitaIva ? `<IdFiscaleIVA>${tag('IdPaese', c.nazione || 'IT')}${tag('IdCodice', c.partitaIva)}</IdFiscaleIVA>` : ''}
        ${c.codiceFiscale ? tag('CodiceFiscale', c.codiceFiscale) : ''}
        <Anagrafica>
          ${anagraficaCliente}
        </Anagrafica>
      </DatiAnagrafici>
      ${c.indirizzo ? `<Sede>
        ${tag('Indirizzo', c.indirizzo)}
        ${tag('CAP', c.cap || '00000')}
        ${tag('Comune', c.comune || '')}
        ${c.provincia ? tag('Provincia', c.provincia) : ''}
        ${tag('Nazione', c.nazione || 'IT')}
      </Sede>` : ''}
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        ${tag('TipoDocumento', tipoDoc)}
        ${tag('Divisa', divisa)}
        ${tag('Data', dati.data)}
        ${tag('Numero', dati.numero)}
        ${tag('ImportoTotaleDocumento', fmt2(importoTotale))}
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>${righeXml.join('')}${riepilogoXml.join('')}
    </DatiBeniServizi>${pagamentoXml}
  </FatturaElettronicaBody>
</p:FatturaElettronica>`
}

// ─── Wrapper high-level: genera XML FatturaPA a partire da fatturaId ─────────

/**
 * Carica la fattura dal DB con dati host e produce il XML FatturaPA pronto per SDI.
 *
 * Applica le regole business:
 *  - CodiceDestinatario = clienteSDI (7 char) o "0000000" se assente
 *  - Se cliente estero (paese != Italia): CodiceDestinatario = "XXXXXXX"
 *  - Se cliente privato senza P.IVA: usa solo CF
 *  - Righe IVA 0 con naturaEsenzione da RigaFattura.naturaEsenzione
 *  - RegimeFiscale da host.regimeFiscale (default RF01)
 *  - ProgressivoInvio: alfanumerico max 10 char derivato dal numero
 */
export async function generaFatturaPA(fatturaId: string): Promise<string> {
  const fattura = await prisma.fattura.findUnique({
    where: { id: fatturaId },
    include: {
      host: {
        select: {
          nomeAzienda: true, partitaIva: true, codiceFiscale: true,
          indirizzo: true, citta: true, cap: true, provincia: true,
        },
      },
      rigeRel: { orderBy: { ordine: 'asc' } },
    },
  })

  if (!fattura) throw new Error(`Fattura ${fatturaId} non trovata`)

  const billing = await getBillingInfo(fattura.hostId)
  const h = fattura.host
  const partitaIva = (billing?.fattPartitaIva || h.partitaIva || '').replace(/^IT/i, '')
  if (!partitaIva) {
    throw new Error('Partita IVA host mancante: impossibile generare XML FatturaPA')
  }

  const emittente: DatiEmittente = {
    denominazione: billing?.fattNomeAzienda || h.nomeAzienda,
    partitaIva,
    codiceFiscale: h.codiceFiscale || undefined,
    regimeFiscale: billing?.regimeFiscale || 'RF01',
    indirizzo: billing?.fattIndirizzo || h.indirizzo || '',
    cap: billing?.fattCap || h.cap || '00000',
    comune: billing?.fattCitta || h.citta || '',
    provincia: billing?.fattProvincia || h.provincia || '',
    nazione: 'IT',
  }

  // Gestione cliente: CodiceDestinatario in base a P.IVA/SDI/estero
  const isEstero = fattura.clientePaese && fattura.clientePaese !== 'Italia' && fattura.clientePaese !== 'IT'
  let codiceSDI = fattura.clienteSDI || '0000000'
  if (isEstero) codiceSDI = 'XXXXXXX'

  const nazioneCliente = isEstero
    ? mappaPaeseACodiceIso(fattura.clientePaese)
    : 'IT'

  const cliente: DatiCliente = {
    denominazione: fattura.clienteNome,
    partitaIva: fattura.clientePIva ? fattura.clientePIva.replace(/^IT/i, '') : undefined,
    codiceFiscale: fattura.clienteCF || undefined,
    indirizzo: fattura.clienteIndirizzo || undefined,
    cap: fattura.clienteCap || undefined,
    comune: fattura.clienteCitta || undefined,
    provincia: isEstero ? undefined : (fattura.clienteProvincia || undefined),
    nazione: nazioneCliente,
    pec: fattura.clientePec || undefined,
    codiceSDI,
  }

  // Righe: preferisci rigeRel (canonico), altrimenti JSON legacy
  type RigaLegacy = { descrizione: string; quantita: number; prezzoUnitario: number; iva?: number; totale: number }
  const righe: RigaFattura[] = fattura.rigeRel.length > 0
    ? fattura.rigeRel.map((r) => ({
        descrizione: r.descrizione,
        quantita: r.quantita,
        prezzoUnitario: r.prezzoUnitario,
        aliquotaIva: r.aliquotaIva,
        natura: r.naturaEsenzione ?? (r.aliquotaIva === 0 ? 'N4' : undefined),
      }))
    : (Array.isArray(fattura.righe) ? (fattura.righe as RigaLegacy[]) : []).map((r) => ({
        descrizione: r.descrizione,
        quantita: r.quantita,
        prezzoUnitario: r.prezzoUnitario,
        aliquotaIva: r.iva ?? fattura.aliquotaIva,
        natura: (r.iva ?? fattura.aliquotaIva) === 0 ? 'N4' : undefined,
      }))

  if (righe.length === 0) {
    throw new Error('Fattura senza righe: impossibile generare XML')
  }

  // ProgressivoInvio: alfanumerico max 10 char
  const progressivoInvio = fattura.numero.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || String(Date.now()).slice(-10)

  return generateFatturaPA({
    progressivoInvio,
    numero: fattura.numero,
    data: fattura.dataEmissione.toISOString().split('T')[0],
    tipoDocumento: fattura.tipoDocumento || 'TD01',
    emittente,
    cliente,
    righe,
    dataScadenza: fattura.dataScadenza?.toISOString().split('T')[0],
    importoPagamento: fattura.totale,
  })
}

/** Mappa nome paese → codice ISO 3166-1 alpha-2 per FatturaPA. */
function mappaPaeseACodiceIso(paese: string | null | undefined): string {
  if (!paese) return 'IT'
  const p = paese.trim().toUpperCase()
  if (p.length === 2) return p
  const MAP: Record<string, string> = {
    'ITALIA': 'IT', 'ITALY': 'IT',
    'FRANCIA': 'FR', 'FRANCE': 'FR',
    'GERMANIA': 'DE', 'GERMANY': 'DE', 'DEUTSCHLAND': 'DE',
    'SPAGNA': 'ES', 'SPAIN': 'ES',
    'REGNO UNITO': 'GB', 'UK': 'GB', 'UNITED KINGDOM': 'GB',
    'STATI UNITI': 'US', 'USA': 'US',
    'SVIZZERA': 'CH', 'SWITZERLAND': 'CH',
    'AUSTRIA': 'AT',
    'OLANDA': 'NL', 'PAESI BASSI': 'NL', 'NETHERLANDS': 'NL',
    'BELGIO': 'BE', 'BELGIUM': 'BE',
    'CINA': 'CN', 'CHINA': 'CN',
    'GIAPPONE': 'JP', 'JAPAN': 'JP',
  }
  return MAP[p] ?? 'XX'
}
