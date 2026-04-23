import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'

/**
 * Helper per esportare i report (revenue, incassi, iva, tassa) in CSV o PDF.
 * PDF: usa PDFKit con lo stesso stile dei report fattura di `lib/pdf-generator.ts`.
 */

// ─── Colori coerenti con pdf-generator ─────────────────────────────────────
const COL = {
  primary: '#4f46e5',
  text: '#1f2937',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  bg: '#f9fafb',
  white: '#ffffff',
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((v) => {
      const s = String(v ?? '')
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }).join(','))
    .join('\n')
}

function csvResponse(content: string, filename: string): NextResponse {
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}

function pdfResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    },
  })
}

const euro = (n: number) =>
  `€ ${new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0)}`

// ────────────────────────────────────────────────────────────────────────────
// PDF helpers
// ────────────────────────────────────────────────────────────────────────────

function writeHeader(doc: PDFKit.PDFDocument, titolo: string, sottotitolo: string) {
  doc.rect(40, 40, 515, 56).fill(COL.primary)
  doc.fontSize(16).fillColor(COL.white).text(titolo, 55, 52)
  doc.fontSize(9).fillColor('#c7d2fe').text(sottotitolo, 55, 74)
  doc.fillColor(COL.text)
}

function writeFooter(doc: PDFKit.PDFDocument) {
  doc.fontSize(7).fillColor(COL.textMuted)
    .text('Otium PMS · Report commercialista', 40, 800, { width: 515, align: 'center' })
}

type Col = { label: string; width: number; align?: 'left' | 'right' }

function writeTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  cols: Col[],
  rows: string[][],
  totali?: string[],
): number {
  const startX = 40
  let y = startY

  // Header
  doc.rect(startX, y, 515, 20).fill(COL.bg)
  doc.fontSize(7).fillColor(COL.textLight).font('Helvetica-Bold')
  let x = startX + 6
  cols.forEach((c) => {
    doc.text(c.label.toUpperCase(), x, y + 6, { width: c.width - 4, align: c.align ?? 'left' })
    x += c.width
  })
  y += 22

  // Rows
  doc.fontSize(9).font('Helvetica').fillColor(COL.text)
  for (const row of rows) {
    if (y > 760) {
      doc.addPage()
      y = 50
    }
    x = startX + 6
    row.forEach((val, i) => {
      doc.text(val, x, y, { width: cols[i].width - 4, align: cols[i].align ?? 'left' })
      x += cols[i].width
    })
    y += 16
    doc.moveTo(startX, y - 2).lineTo(startX + 515, y - 2).strokeColor(COL.border).lineWidth(0.3).stroke()
  }

  if (totali) {
    doc.rect(startX, y, 515, 22).fill(COL.bg)
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COL.text)
    x = startX + 6
    totali.forEach((val, i) => {
      doc.text(val, x, y + 6, { width: cols[i].width - 4, align: cols[i].align ?? 'left' })
      x += cols[i].width
    })
    y += 26
  }

  return y
}

// ────────────────────────────────────────────────────────────────────────────
// Revenue
// ────────────────────────────────────────────────────────────────────────────

type RevenueData = {
  periodo: { da: string; a: string; granularita: string; vista: string }
  righe: Array<{
    periodo: string; prenotazioni: number; notti: number
    revenueCamere: number; revenueSpa: number; revenuePOS: number; revenueFB: number
    tassaSoggiorno: number; totale: number
  }>
  totali: {
    prenotazioni: number; notti: number
    revenueCamere: number; revenueSpa: number; revenuePOS: number; revenueFB: number
    tassaSoggiorno: number; totale: number
  }
  camere: Array<{
    unitaNome: string; notti: number; occupazione: number
    revenue: number; adr: number; revpar: number
  }>
}

export async function generateReportRevenueCsvPdf(
  data: RevenueData,
  formato: 'csv' | 'pdf',
): Promise<NextResponse> {
  const nomeFile = `report-revenue-${data.periodo.da}_${data.periodo.a}`

  if (formato === 'csv') {
    const head: (string | number)[][] = [
      ['Periodo', 'Prenotazioni', 'Notti', 'Revenue Camere', 'Revenue SPA', 'Revenue POS', 'Revenue F&B', 'Tassa soggiorno', 'Totale'],
    ]
    const rows: (string | number)[][] = data.righe.map((r) => [
      r.periodo, r.prenotazioni, r.notti,
      r.revenueCamere.toFixed(2), r.revenueSpa.toFixed(2), r.revenuePOS.toFixed(2),
      r.revenueFB.toFixed(2), r.tassaSoggiorno.toFixed(2), r.totale.toFixed(2),
    ])
    const tot: (string | number)[][] = [[
      'TOTALE', data.totali.prenotazioni, data.totali.notti,
      data.totali.revenueCamere.toFixed(2), data.totali.revenueSpa.toFixed(2),
      data.totali.revenuePOS.toFixed(2), data.totali.revenueFB.toFixed(2),
      data.totali.tassaSoggiorno.toFixed(2), data.totali.totale.toFixed(2),
    ]]
    return csvResponse(toCsv([...head, ...rows, ...tot]), nomeFile)
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  writeHeader(doc, 'Report Revenue', `Periodo ${data.periodo.da} → ${data.periodo.a} · ${data.periodo.granularita}`)

  const cols: Col[] = [
    { label: 'Periodo', width: 75 },
    { label: 'Pren.', width: 40, align: 'right' },
    { label: 'Notti', width: 40, align: 'right' },
    { label: 'Camere', width: 65, align: 'right' },
    { label: 'SPA', width: 55, align: 'right' },
    { label: 'POS', width: 55, align: 'right' },
    { label: 'F&B', width: 55, align: 'right' },
    { label: 'Tassa', width: 55, align: 'right' },
    { label: 'Totale', width: 70, align: 'right' },
  ]
  const rows = data.righe.map((r) => [
    r.periodo,
    String(r.prenotazioni), String(r.notti),
    euro(r.revenueCamere), euro(r.revenueSpa), euro(r.revenuePOS),
    euro(r.revenueFB), euro(r.tassaSoggiorno), euro(r.totale),
  ])
  const totali = [
    'TOTALE',
    String(data.totali.prenotazioni), String(data.totali.notti),
    euro(data.totali.revenueCamere), euro(data.totali.revenueSpa), euro(data.totali.revenuePOS),
    euro(data.totali.revenueFB), euro(data.totali.tassaSoggiorno), euro(data.totali.totale),
  ]
  writeTable(doc, 120, cols, rows, totali)
  writeFooter(doc)

  return pdfResponse(await pdfToBuffer(doc), nomeFile)
}

// ────────────────────────────────────────────────────────────────────────────
// Incassi
// ────────────────────────────────────────────────────────────────────────────

type IncassiData = {
  periodo: { da: string; a: string }
  righe: Array<{
    data: string; descrizione: string; cameraOspite: string | null
    metodo: string; importo: number; operatore: string | null
  }>
  perMetodo: Array<{ metodo: string; count: number; totale: number }>
  riconciliazione: { totaleIncassato: number; totaleFatturato: number; discrepanza: number; quadrato: boolean }
}

export async function generateReportIncassiCsvPdf(
  data: IncassiData,
  formato: 'csv' | 'pdf',
): Promise<NextResponse> {
  const nomeFile = `report-incassi-${data.periodo.da}_${data.periodo.a}`

  if (formato === 'csv') {
    const head: (string | number)[][] = [
      ['Data', 'Descrizione', 'Camera/Ospite', 'Metodo', 'Importo', 'Operatore'],
    ]
    const rows: (string | number)[][] = data.righe.map((r) => [
      new Date(r.data).toLocaleString('it-IT'),
      r.descrizione, r.cameraOspite ?? '', r.metodo,
      r.importo.toFixed(2), r.operatore ?? '',
    ])
    const sep: (string | number)[][] = [[''], ['Totali per metodo'], ['Metodo', 'N°', 'Totale']]
    const perMetodo: (string | number)[][] = data.perMetodo.map((m) => [m.metodo, m.count, m.totale.toFixed(2)])
    const ric: (string | number)[][] = [
      [''],
      ['Riconciliazione'],
      ['Incassato', data.riconciliazione.totaleIncassato.toFixed(2)],
      ['Fatturato', data.riconciliazione.totaleFatturato.toFixed(2)],
      ['Discrepanza', data.riconciliazione.discrepanza.toFixed(2)],
    ]
    return csvResponse(toCsv([...head, ...rows, ...sep, ...perMetodo, ...ric]), nomeFile)
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  writeHeader(doc, 'Report Incassi', `Periodo ${data.periodo.da} → ${data.periodo.a}`)

  const cols: Col[] = [
    { label: 'Data', width: 80 },
    { label: 'Descrizione', width: 150 },
    { label: 'Camera / Ospite', width: 130 },
    { label: 'Metodo', width: 60 },
    { label: 'Importo', width: 55, align: 'right' },
    { label: 'Operat.', width: 40 },
  ]
  const rows = data.righe.map((r) => [
    new Date(r.data).toLocaleDateString('it-IT'),
    r.descrizione.slice(0, 30),
    (r.cameraOspite ?? '').slice(0, 28),
    r.metodo,
    euro(r.importo),
    (r.operatore ?? '').slice(0, 10),
  ])
  let y = writeTable(doc, 120, cols, rows)

  // Riconciliazione
  y += 14
  doc.fontSize(12).font('Helvetica-Bold').fillColor(COL.text).text('Riconciliazione', 40, y)
  y += 18
  doc.fontSize(10).font('Helvetica')
  doc.text(`Incassato: ${euro(data.riconciliazione.totaleIncassato)}`, 40, y); y += 14
  doc.text(`Fatturato: ${euro(data.riconciliazione.totaleFatturato)}`, 40, y); y += 14
  doc.fillColor(data.riconciliazione.quadrato ? '#16a34a' : '#dc2626')
  doc.text(`Discrepanza: ${euro(data.riconciliazione.discrepanza)}${data.riconciliazione.quadrato ? ' — quadrato' : ''}`, 40, y)
  writeFooter(doc)

  return pdfResponse(await pdfToBuffer(doc), nomeFile)
}

// ────────────────────────────────────────────────────────────────────────────
// IVA
// ────────────────────────────────────────────────────────────────────────────

type IvaData = {
  periodo: { tipo: string; anno: number; mese: number | null; trimestre: number | null; da: string; a: string }
  fattureEsaminate: number
  righe: Array<{ aliquota: number; natura: string | null; imponibile: number; iva: number; totale: number }>
  totali: { imponibile: number; iva: number; totale: number }
}

export async function generateReportIvaCsvPdf(
  data: IvaData,
  formato: 'csv' | 'pdf',
): Promise<NextResponse> {
  const nomeFile = `report-iva-${data.periodo.da}_${data.periodo.a}`

  if (formato === 'csv') {
    const head: (string | number)[][] = [['Aliquota %', 'Natura esenzione', 'Imponibile', 'IVA', 'Totale']]
    const rows: (string | number)[][] = data.righe.map((r) => [
      r.aliquota, r.natura ?? '',
      r.imponibile.toFixed(2), r.iva.toFixed(2), r.totale.toFixed(2),
    ])
    const tot: (string | number)[][] = [[
      'TOTALE', '',
      data.totali.imponibile.toFixed(2), data.totali.iva.toFixed(2), data.totali.totale.toFixed(2),
    ]]
    return csvResponse(toCsv([...head, ...rows, ...tot]), nomeFile)
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  writeHeader(doc, 'Riepilogo IVA', `Periodo ${data.periodo.da} → ${data.periodo.a} · ${data.fattureEsaminate} fatture`)
  const cols: Col[] = [
    { label: 'Aliquota', width: 80 },
    { label: 'Natura', width: 150 },
    { label: 'Imponibile', width: 100, align: 'right' },
    { label: 'IVA', width: 90, align: 'right' },
    { label: 'Totale', width: 95, align: 'right' },
  ]
  const rows = data.righe.map((r) => [
    `${r.aliquota}%`, r.natura ?? '—',
    euro(r.imponibile), euro(r.iva), euro(r.totale),
  ])
  const totali = [
    'TOTALE', '',
    euro(data.totali.imponibile), euro(data.totali.iva), euro(data.totali.totale),
  ]
  writeTable(doc, 120, cols, rows, totali)
  writeFooter(doc)
  return pdfResponse(await pdfToBuffer(doc), nomeFile)
}

// ────────────────────────────────────────────────────────────────────────────
// Tassa soggiorno
// ────────────────────────────────────────────────────────────────────────────

type TassaData = {
  anno: number
  mese: number
  dettaglio: Array<{
    ospite: string; struttura: string; unita: string
    arrivo: string; partenza: string | null
    nottiNelMese: number; numOspiti: number
    tassaPerNotte: number; totaleTassa: number
  }>
  perStruttura: Array<{ nome: string; citta: string; ospiti: number; notti: number; totale: number }>
  riepilogo: { prenotazioni: number; totaleOspiti: number; totaleNotti: number; totaleTassa: number }
}

export async function generateReportTassaCsvPdf(
  data: TassaData,
  formato: 'csv' | 'pdf',
): Promise<NextResponse> {
  const nomeFile = `tassa-soggiorno-${data.anno}-${String(data.mese).padStart(2, '0')}`

  if (formato === 'csv') {
    const head: (string | number)[][] = [[
      'Ospite', 'Struttura', 'Unità', 'Arrivo', 'Partenza',
      'Notti nel mese', 'N° ospiti', 'Tassa/notte', 'Totale tassa',
    ]]
    const rows: (string | number)[][] = data.dettaglio.map((d) => [
      d.ospite, d.struttura, d.unita,
      d.arrivo ? new Date(d.arrivo).toLocaleDateString('it-IT') : '',
      d.partenza ? new Date(d.partenza).toLocaleDateString('it-IT') : '',
      d.nottiNelMese, d.numOspiti,
      d.tassaPerNotte.toFixed(2), d.totaleTassa.toFixed(2),
    ])
    const tot: (string | number)[][] = [[
      'TOTALE', '', '', '', '',
      data.riepilogo.totaleNotti, data.riepilogo.totaleOspiti, '',
      data.riepilogo.totaleTassa.toFixed(2),
    ]]
    return csvResponse(toCsv([...head, ...rows, ...tot]), nomeFile)
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  writeHeader(doc, `Tassa di soggiorno ${String(data.mese).padStart(2, '0')}/${data.anno}`,
    `${data.riepilogo.prenotazioni} prenotazioni · ${data.riepilogo.totaleNotti} notti`)
  const cols: Col[] = [
    { label: 'Ospite', width: 120 },
    { label: 'Struttura', width: 110 },
    { label: 'Unità', width: 70 },
    { label: 'Notti', width: 40, align: 'right' },
    { label: 'Osp.', width: 35, align: 'right' },
    { label: 'Tassa/nt', width: 60, align: 'right' },
    { label: 'Totale', width: 70, align: 'right' },
  ]
  const rows = data.dettaglio.map((d) => [
    d.ospite.slice(0, 22), d.struttura.slice(0, 20), d.unita.slice(0, 14),
    String(d.nottiNelMese), String(d.numOspiti),
    euro(d.tassaPerNotte), euro(d.totaleTassa),
  ])
  const totali = [
    'TOTALE', '', '',
    String(data.riepilogo.totaleNotti), String(data.riepilogo.totaleOspiti),
    '', euro(data.riepilogo.totaleTassa),
  ]
  writeTable(doc, 120, cols, rows, totali)
  writeFooter(doc)
  return pdfResponse(await pdfToBuffer(doc), nomeFile)
}
