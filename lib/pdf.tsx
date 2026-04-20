/**
 * Generatore PDF Fattura con PDFKit.
 * Compatibile serverless Vercel + Turbopack.
 *
 * Layout professionale:
 *  - Header con logo host + dati azienda (a sinistra) + numero fattura (a destra)
 *  - Dati cliente (destra)
 *  - Tabella righe con quantita, prezzo, IVA, totale
 *  - Riepilogo IVA per aliquota
 *  - Totali (imponibile, IVA, totale)
 *  - Dati pagamento (se configurato)
 *  - Footer con regime fiscale e note
 */

import PDFDocument from 'pdfkit'
import { prisma } from '@/lib/db'

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface RigaFatturaData {
  descrizione: string
  quantita: number
  prezzoUnitario: number
  iva: number
  totale: number
  naturaEsenzione?: string | null
}

interface FatturaInput {
  numero: string
  anno: number
  dataEmissione: Date
  dataScadenza?: Date | null
  stato: string
  tipoDocumento?: string | null // TD01, TD04 (nota di credito)
  clienteNome: string
  clientePIva?: string | null
  clienteCF?: string | null
  clienteIndirizzo?: string | null
  clienteCitta?: string | null
  clienteCap?: string | null
  clienteProvincia?: string | null
  clientePaese: string
  clienteEmail?: string | null
  clientePec?: string | null
  clienteSDI?: string | null
  righe: RigaFatturaData[] | unknown
  imponibile: number
  iva: number
  totale: number
  aliquotaIva: number
  note?: string | null
  riferimentoNumero?: string | null // per nota credito: numero fattura originale
}

interface EmittenteInput {
  nomeAzienda: string
  partitaIva?: string | null
  codiceFiscale?: string | null
  regimeFiscale?: string | null
  indirizzo?: string | null
  citta?: string | null
  cap?: string | null
  provincia?: string | null
  paese?: string | null
  telefono?: string | null
  email?: string | null
  pec?: string | null
  sitoWeb?: string | null
  iban?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRAND = '#4f46e5'
const GRAY = '#6b7280'
const DARK = '#111827'
const BORDER = '#e5e7eb'
const BG = '#f9fafb'

function fmtData(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtValuta(n: number): string {
  return `€ ${n.toFixed(2)}`
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

function calcolaRiepilogoIva(righe: RigaFatturaData[]): { aliquota: number; imponibile: number; imposta: number; natura?: string | null }[] {
  const byKey = new Map<string, { aliquota: number; imponibile: number; imposta: number; natura?: string | null }>()
  for (const r of righe) {
    const key = `${r.iva}_${r.naturaEsenzione ?? ''}`
    const imposta = r.totale * (r.iva / 100)
    const cur = byKey.get(key)
    if (cur) { cur.imponibile += r.totale; cur.imposta += imposta }
    else byKey.set(key, { aliquota: r.iva, imponibile: r.totale, imposta, natura: r.naturaEsenzione ?? null })
  }
  return Array.from(byKey.values())
    .map((r) => ({
      aliquota: r.aliquota,
      imponibile: Math.round(r.imponibile * 100) / 100,
      imposta: Math.round(r.imposta * 100) / 100,
      natura: r.natura,
    }))
    .sort((a, b) => a.aliquota - b.aliquota)
}

// ─── Render bytes dati ───────────────────────────────────────────────────────

/**
 * Genera PDF a partire da oggetti (usato da chi ha gia` caricato i dati).
 * Per generare da ID prenotazione usa `generaPdfFattura(fatturaId)`.
 */
export async function renderFatturaPdf(
  fattura: FatturaInput,
  emittente: EmittenteInput,
): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const righe = Array.isArray(fattura.righe) ? (fattura.righe as RigaFatturaData[]) : []

  const isNotaCredito = fattura.tipoDocumento === 'TD04'
  const titolo = isNotaCredito ? 'NOTA DI CREDITO' : 'FATTURA'

  // ── Header ──
  doc.fontSize(16).fillColor(BRAND).font('Helvetica-Bold').text(emittente.nomeAzienda, 48, 48)
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
  const infoAzienda: string[] = []
  if (emittente.partitaIva) infoAzienda.push(`P.IVA ${emittente.partitaIva}`)
  if (emittente.codiceFiscale && emittente.codiceFiscale !== emittente.partitaIva) infoAzienda.push(`CF ${emittente.codiceFiscale}`)
  if (emittente.indirizzo) infoAzienda.push(emittente.indirizzo)
  const cittaLine = [emittente.cap, emittente.citta, emittente.provincia].filter(Boolean).join(' ')
  if (cittaLine) infoAzienda.push(cittaLine)
  if (emittente.telefono) infoAzienda.push(`Tel. ${emittente.telefono}`)
  if (emittente.email) infoAzienda.push(emittente.email)
  if (emittente.pec) infoAzienda.push(`PEC: ${emittente.pec}`)
  infoAzienda.forEach((l, i) => doc.text(l, 48, 68 + i * 11))

  // Titolo documento (a destra)
  doc.fontSize(14).fillColor(DARK).font('Helvetica-Bold').text(titolo, 340, 48, { width: 207, align: 'right' })
  doc.fontSize(11).fillColor(BRAND).font('Helvetica-Bold').text(`N. ${fattura.numero}`, 340, 68, { width: 207, align: 'right' })
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
  doc.text(`Emessa il ${fmtData(new Date(fattura.dataEmissione))}`, 340, 86, { width: 207, align: 'right' })
  if (fattura.dataScadenza) {
    doc.text(`Scadenza: ${fmtData(new Date(fattura.dataScadenza))}`, 340, 98, { width: 207, align: 'right' })
  }
  if (isNotaCredito && fattura.riferimentoNumero) {
    doc.text(`Rif. fattura ${fattura.riferimentoNumero}`, 340, 110, { width: 207, align: 'right' })
  }

  // ── Cliente ──
  const addrY = Math.max(doc.y, 140) + 10

  doc.fontSize(7).fillColor(GRAY).font('Helvetica-Bold').text('CLIENTE', 48, addrY)
  doc.rect(48, addrY + 12, 500, 0.6).fill(BORDER)

  let clienteY = addrY + 20
  doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text(fattura.clienteNome, 48, clienteY, { width: 500 })
  clienteY += 16

  doc.fontSize(9).fillColor('#374151').font('Helvetica')
  const clienteInfo: string[] = []
  if (fattura.clientePIva) clienteInfo.push(`P.IVA: ${fattura.clientePIva}`)
  if (fattura.clienteCF) clienteInfo.push(`Codice Fiscale: ${fattura.clienteCF}`)
  if (fattura.clienteIndirizzo) clienteInfo.push(fattura.clienteIndirizzo)
  const clCitta = [fattura.clienteCap, fattura.clienteCitta, fattura.clienteProvincia].filter(Boolean).join(' ')
  if (clCitta) clienteInfo.push(clCitta)
  if (fattura.clientePaese && fattura.clientePaese !== 'Italia') clienteInfo.push(fattura.clientePaese)
  if (fattura.clienteSDI) clienteInfo.push(`Codice SDI: ${fattura.clienteSDI}`)
  if (fattura.clientePec) clienteInfo.push(`PEC: ${fattura.clientePec}`)
  if (fattura.clienteEmail) clienteInfo.push(`Email: ${fattura.clienteEmail}`)

  clienteInfo.forEach((l) => {
    doc.text(l, 48, clienteY, { width: 500 })
    clienteY += 12
  })

  // ── Tabella righe ──
  let tableTop = clienteY + 16
  const colX = { desc: 48, qty: 310, price: 365, iva: 425, tot: 475 }

  doc.rect(48, tableTop, 500, 20).fill(BRAND)
  doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
  doc.text('Descrizione', colX.desc + 6, tableTop + 6)
  doc.text('Qta', colX.qty, tableTop + 6, { width: 45, align: 'center' })
  doc.text('Unitario', colX.price, tableTop + 6, { width: 55, align: 'right' })
  doc.text('IVA', colX.iva, tableTop + 6, { width: 45, align: 'center' })
  doc.text('Totale', colX.tot, tableTop + 6, { width: 65, align: 'right' })

  let rowY = tableTop + 24
  doc.font('Helvetica').fontSize(9)

  righe.forEach((r, i) => {
    if (i % 2 === 1) {
      doc.rect(48, rowY - 4, 500, 18).fill(BG)
    }
    doc.fillColor('#374151')
    doc.text(r.descrizione, colX.desc + 6, rowY, { width: 250 })
    doc.text(String(r.quantita), colX.qty, rowY, { width: 45, align: 'center' })
    doc.text(fmtValuta(r.prezzoUnitario), colX.price, rowY, { width: 55, align: 'right' })
    const ivaLabel = r.iva === 0 ? (r.naturaEsenzione || 'esente') : `${r.iva}%`
    doc.text(ivaLabel, colX.iva, rowY, { width: 45, align: 'center' })
    doc.text(fmtValuta(r.totale), colX.tot, rowY, { width: 65, align: 'right' })
    doc.moveTo(48, rowY + 14).lineTo(548, rowY + 14).strokeColor(BORDER).lineWidth(0.3).stroke()
    rowY += 18
  })

  // ── Riepilogo IVA per aliquota ──
  const riepilogoIva = calcolaRiepilogoIva(righe)
  let summaryY = rowY + 14

  if (riepilogoIva.length > 1) {
    doc.fontSize(8).fillColor(GRAY).font('Helvetica-Bold').text('RIEPILOGO IVA', 48, summaryY)
    summaryY += 14
    doc.fontSize(8).font('Helvetica').fillColor('#374151')
    doc.text('Aliquota', 48, summaryY, { width: 80 })
    doc.text('Natura', 128, summaryY, { width: 80 })
    doc.text('Imponibile', 208, summaryY, { width: 90, align: 'right' })
    doc.text('Imposta', 298, summaryY, { width: 90, align: 'right' })
    doc.moveTo(48, summaryY + 12).lineTo(388, summaryY + 12).strokeColor(BORDER).stroke()
    summaryY += 16
    riepilogoIva.forEach((r) => {
      doc.text(r.aliquota === 0 ? 'Esente' : `${r.aliquota}%`, 48, summaryY, { width: 80 })
      doc.text(r.natura ?? '—', 128, summaryY, { width: 80 })
      doc.text(fmtValuta(r.imponibile), 208, summaryY, { width: 90, align: 'right' })
      doc.text(fmtValuta(r.imposta), 298, summaryY, { width: 90, align: 'right' })
      summaryY += 14
    })
  }

  // ── Totali (a destra) ──
  const totY = Math.max(summaryY + 8, rowY + 14)
  doc.fontSize(9).fillColor(GRAY).font('Helvetica')
  doc.text('Imponibile', 380, totY, { width: 80, align: 'right' })
  doc.fillColor(DARK).text(fmtValuta(fattura.imponibile), 470, totY, { width: 78, align: 'right' })

  doc.fillColor(GRAY).text('IVA', 380, totY + 16, { width: 80, align: 'right' })
  doc.fillColor(DARK).text(fmtValuta(fattura.iva), 470, totY + 16, { width: 78, align: 'right' })

  doc.moveTo(380, totY + 34).lineTo(548, totY + 34).strokeColor(BRAND).lineWidth(1.5).stroke()
  doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text('TOTALE', 380, totY + 40, { width: 80, align: 'right' })
  doc.fillColor(BRAND).text(fmtValuta(fattura.totale), 470, totY + 40, { width: 78, align: 'right' })

  // ── Dati pagamento (IBAN) ──
  let afterTotY = totY + 64
  if (emittente.iban && !isNotaCredito) {
    doc.fontSize(8).fillColor(GRAY).font('Helvetica-Bold').text('ESTREMI PAGAMENTO', 48, afterTotY)
    doc.fontSize(9).fillColor('#374151').font('Helvetica').text(`IBAN: ${emittente.iban}`, 48, afterTotY + 14)
    if (fattura.dataScadenza) {
      doc.text(`Scadenza: ${fmtData(new Date(fattura.dataScadenza))}`, 48, afterTotY + 28)
    }
    afterTotY += 48
  }

  // ── Note ──
  if (fattura.note) {
    doc.rect(48, afterTotY, 500, 40).fill(BG)
    doc.fontSize(7).fillColor(GRAY).font('Helvetica-Bold').text('NOTE', 58, afterTotY + 8)
    doc.fontSize(8).fillColor('#374151').font('Helvetica').text(fattura.note, 58, afterTotY + 20, { width: 480 })
    afterTotY += 50
  }

  // ── Footer ──
  const footerY = 780
  doc.fontSize(7).fillColor(GRAY).font('Helvetica')
  const regimeLabel = regimeFiscaleLabel(emittente.regimeFiscale)
  doc.text(regimeLabel, 48, footerY, { width: 300 })
  doc.text(`${titolo} N. ${fattura.numero}`, 350, footerY, { width: 198, align: 'right' })

  const buffer = await pdfToBuffer(doc)
  return new Uint8Array(buffer)
}

function regimeFiscaleLabel(codice: string | null | undefined): string {
  const MAP: Record<string, string> = {
    RF01: 'Regime ordinario',
    RF02: 'Contribuenti minimi (art. 1, c. 96-117, L. 244/2007)',
    RF04: 'Agricoltura e attivita connesse e pesca',
    RF05: 'Vendita sali e tabacchi',
    RF06: 'Commercio fiammiferi',
    RF07: 'Editoria',
    RF08: 'Gestione servizi telefonia pubblica',
    RF09: 'Rivendita documenti trasporto pubblico',
    RF10: 'Intrattenimenti, giochi e attivita di cui alla tariffa allegata al DPR 640/72',
    RF11: 'Agenzie viaggi e turismo',
    RF12: 'Agriturismo',
    RF13: 'Vendite a domicilio',
    RF14: 'Rivendita beni usati, oggetti arte, antiquariato o collezione',
    RF15: 'Agenzie di vendite all\'asta di oggetti arte, antiquariato o collezione',
    RF16: 'IVA per cassa PA (art. 6, c. 5, DPR 633/72)',
    RF17: 'IVA per cassa (art. 32-bis, DL 83/2012)',
    RF18: 'Altro',
    RF19: 'Regime forfettario (art. 1, c. 54-89, L. 190/2014)',
  }
  if (!codice) return 'Regime fiscale non specificato'
  return MAP[codice] ?? `Regime ${codice}`
}

// ─── Wrapper high-level: genera PDF a partire da fatturaId ──────────────────

/**
 * Carica la fattura dal DB insieme ai dati del host e genera il PDF.
 * Ritorna i bytes grezzi (Uint8Array).
 *
 * Accetta due overload:
 *  - generaPdfFattura(fatturaId: string)  → carica da DB
 *  - generaPdfFattura(fattura: FatturaInput)  → per retrocompatibilita`
 */
export async function generaPdfFattura(fatturaOrId: string | FatturaInput): Promise<Uint8Array> {
  if (typeof fatturaOrId === 'string') {
    return generaPdfFatturaDaId(fatturaOrId)
  }
  // Retrocompat: senza dati host, usa default minimo
  return renderFatturaPdf(fatturaOrId, {
    nomeAzienda: 'Otium Week',
    partitaIva: null,
    regimeFiscale: 'RF01',
  })
}

async function generaPdfFatturaDaId(fatturaId: string): Promise<Uint8Array> {
  const fattura = await prisma.fattura.findUnique({
    where: { id: fatturaId },
    include: {
      host: {
        select: {
          nomeAzienda: true, partitaIva: true, codiceFiscale: true,
          indirizzo: true, citta: true, cap: true, provincia: true,
          telefono: true, regimeFiscale: true, sitoWeb: true,
          fattNomeAzienda: true, fattPartitaIva: true, fattIndirizzo: true,
          fattCitta: true, fattCap: true, fattProvincia: true, fattPaese: true,
          fattEmail: true, fattPec: true,
          user: { select: { email: true } },
        },
      },
      riferimentoFattura: { select: { numero: true } },
      rigeRel: { orderBy: { ordine: 'asc' } },
    },
  })

  if (!fattura) throw new Error(`Fattura ${fatturaId} non trovata`)

  const h = fattura.host
  const emittente: EmittenteInput = {
    nomeAzienda: h.fattNomeAzienda ?? h.nomeAzienda,
    partitaIva: h.fattPartitaIva ?? h.partitaIva,
    codiceFiscale: h.codiceFiscale,
    regimeFiscale: h.regimeFiscale,
    indirizzo: h.fattIndirizzo ?? h.indirizzo,
    citta: h.fattCitta ?? h.citta,
    cap: h.fattCap ?? h.cap,
    provincia: h.fattProvincia ?? h.provincia,
    paese: h.fattPaese,
    telefono: h.telefono,
    email: h.fattEmail ?? h.user?.email ?? null,
    pec: h.fattPec,
    sitoWeb: h.sitoWeb,
  }

  // Preferisci rigeRel (canonico) se presente, altrimenti JSON legacy
  const righe: RigaFatturaData[] = fattura.rigeRel.length > 0
    ? fattura.rigeRel.map((r) => ({
        descrizione: r.descrizione,
        quantita: r.quantita,
        prezzoUnitario: r.prezzoUnitario,
        iva: r.aliquotaIva,
        totale: r.totale,
        naturaEsenzione: r.naturaEsenzione,
      }))
    : (Array.isArray(fattura.righe) ? (fattura.righe as unknown as RigaFatturaData[]) : [])

  return renderFatturaPdf(
    { ...fattura, righe, riferimentoNumero: fattura.riferimentoFattura?.numero ?? null },
    emittente,
  )
}
