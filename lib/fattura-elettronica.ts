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
