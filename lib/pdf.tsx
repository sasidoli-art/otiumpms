/**
 * Generatore PDF Fattura con PDFKit.
 * Compatibile serverless Vercel + Turbopack.
 */

import PDFDocument from 'pdfkit'

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface RigaFattura {
  descrizione: string
  quantita: number
  prezzoUnitario: number
  iva: number
  totale: number
}

interface Fattura {
  numero: string
  anno: number
  dataEmissione: Date
  dataScadenza?: Date | null
  stato: string
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
  righe: RigaFattura[] | unknown
  imponibile: number
  iva: number
  totale: number
  aliquotaIva: number
  note?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRAND = '#4f46e5'
const GRAY = '#6b7280'

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

// ─── Genera PDF Fattura ──────────────────────────────────────────────────────

export async function generaPdfFattura(fattura: Fattura): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const righe = Array.isArray(fattura.righe) ? (fattura.righe as RigaFattura[]) : []

  // ── Header ──
  doc.fontSize(18).fillColor(BRAND).text('Otium Week', { continued: false })
  doc.fontSize(8).fillColor(GRAY).text('otiumweek.it')
  doc.moveUp(2)
  doc.fontSize(14).fillColor('#111827').text('FATTURA', { align: 'right' })
  doc.fontSize(10).fillColor(BRAND).text(`N. ${fattura.numero}`, { align: 'right' })
  doc.fontSize(8).fillColor(GRAY).text(`Emessa il ${fmtData(new Date(fattura.dataEmissione))}`, { align: 'right' })
  if (fattura.dataScadenza) {
    doc.text(`Scadenza: ${fmtData(new Date(fattura.dataScadenza))}`, { align: 'right' })
  }

  doc.moveDown(2)

  // ── Indirizzi ──
  const addrY = doc.y

  // Fornitore (sinistra)
  doc.fontSize(7).fillColor(GRAY).text('FORNITORE', 48, addrY)
  doc.fontSize(10).fillColor('#111827').text('Otium Week S.r.l.', 48, addrY + 14, { bold: true } as any)
  doc.fontSize(9).fillColor('#374151').text('P.IVA: IT00000000000', 48, addrY + 28)
  doc.text('otiumweek.it', 48, addrY + 40)

  // Cliente (destra)
  doc.fontSize(7).fillColor(GRAY).text('CLIENTE', 300, addrY)
  doc.fontSize(10).fillColor('#111827').text(fattura.clienteNome, 300, addrY + 14)
  let clienteY = addrY + 28
  if (fattura.clientePIva) { doc.fontSize(9).fillColor('#374151').text(`P.IVA: ${fattura.clientePIva}`, 300, clienteY); clienteY += 12 }
  if (fattura.clienteCF) { doc.text(`CF: ${fattura.clienteCF}`, 300, clienteY); clienteY += 12 }
  if (fattura.clienteIndirizzo) { doc.text(fattura.clienteIndirizzo, 300, clienteY); clienteY += 12 }
  if (fattura.clienteCitta || fattura.clienteCap) {
    doc.text([fattura.clienteCap, fattura.clienteCitta, fattura.clienteProvincia].filter(Boolean).join(' '), 300, clienteY)
    clienteY += 12
  }
  doc.text(fattura.clientePaese, 300, clienteY); clienteY += 12
  if (fattura.clienteSDI) { doc.text(`SDI: ${fattura.clienteSDI}`, 300, clienteY); clienteY += 12 }
  if (fattura.clientePec) { doc.text(`PEC: ${fattura.clientePec}`, 300, clienteY); clienteY += 12 }
  if (fattura.clienteEmail) { doc.text(fattura.clienteEmail, 300, clienteY); clienteY += 12 }

  doc.y = Math.max(doc.y, clienteY) + 20

  // ── Tabella righe ──
  const tableTop = doc.y
  const colX = { desc: 48, qty: 310, price: 370, iva: 430, tot: 475 }

  // Header tabella
  doc.rect(48, tableTop, 500, 20).fill(BRAND)
  doc.fontSize(8).fillColor('#ffffff')
  doc.text('Descrizione', colX.desc + 6, tableTop + 5)
  doc.text('Qtà', colX.qty, tableTop + 5, { width: 50, align: 'center' })
  doc.text('Unitario', colX.price, tableTop + 5, { width: 55, align: 'right' })
  doc.text('IVA %', colX.iva, tableTop + 5, { width: 40, align: 'center' })
  doc.text('Totale', colX.tot, tableTop + 5, { width: 65, align: 'right' })

  let rowY = tableTop + 24
  doc.fontSize(9).fillColor('#374151')

  righe.forEach((r, i) => {
    if (i % 2 === 1) {
      doc.rect(48, rowY - 2, 500, 18).fill('#f9fafb')
      doc.fillColor('#374151')
    }
    doc.text(r.descrizione, colX.desc + 6, rowY, { width: 250 })
    doc.text(String(r.quantita), colX.qty, rowY, { width: 50, align: 'center' })
    doc.text(fmtValuta(r.prezzoUnitario), colX.price, rowY, { width: 55, align: 'right' })
    doc.text(`${r.iva}%`, colX.iva, rowY, { width: 40, align: 'center' })
    doc.text(fmtValuta(r.totale), colX.tot, rowY, { width: 65, align: 'right' })
    // Separatore
    doc.moveTo(48, rowY + 14).lineTo(548, rowY + 14).strokeColor('#e5e7eb').lineWidth(0.5).stroke()
    rowY += 18
  })

  // ── Totali ──
  const totY = rowY + 15
  doc.fontSize(9).fillColor(GRAY)
  doc.text('Imponibile', 380, totY, { width: 80, align: 'right' })
  doc.fillColor('#111827').text(fmtValuta(fattura.imponibile), 470, totY, { width: 70, align: 'right' })

  doc.fillColor(GRAY).text(`IVA (${fattura.aliquotaIva}%)`, 380, totY + 16, { width: 80, align: 'right' })
  doc.fillColor('#111827').text(fmtValuta(fattura.iva), 470, totY + 16, { width: 70, align: 'right' })

  doc.moveTo(380, totY + 34).lineTo(540, totY + 34).strokeColor(BRAND).lineWidth(1.5).stroke()
  doc.fontSize(11).fillColor('#111827').text('TOTALE', 380, totY + 40, { width: 80, align: 'right' })
  doc.fillColor(BRAND).text(fmtValuta(fattura.totale), 470, totY + 40, { width: 70, align: 'right' })

  // ── Note ──
  if (fattura.note) {
    const noteY = totY + 65
    doc.rect(48, noteY, 500, 40).fill('#f9fafb')
    doc.fontSize(7).fillColor(GRAY).text('NOTE', 58, noteY + 8)
    doc.fontSize(8).fillColor('#374151').text(fattura.note, 58, noteY + 20, { width: 480 })
  }

  // ── Footer ──
  doc.fontSize(7).fillColor(GRAY)
  doc.text('Otium Week · otiumweek.it', 48, 780)
  doc.text(`Fattura N. ${fattura.numero}`, 400, 780, { width: 140, align: 'right' })

  const buffer = await pdfToBuffer(doc)
  return new Uint8Array(buffer)
}
