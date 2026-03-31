/**
 * Generatore PDF con PDFKit — compatibile Turbopack/Edge.
 * Sostituisce @react-pdf/renderer che non funziona con Next.js 16 Turbopack.
 */

import PDFDocument from 'pdfkit'

// ─── Colori ───────────────────────────────────────────────────────────────────

const COL = {
  primary: '#4f46e5',
  primaryLight: '#eef2ff',
  text: '#1f2937',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  success: '#16a34a',
  white: '#ffffff',
  bg: '#f9fafb',
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

// ─── Report Mensile PDF ───────────────────────────────────────────────────────

export interface ReportPdfData {
  anno: number
  mese: number
  numGiorni: number
  unitaTotali: number
  nomeAzienda: string
  revenueTotale: number
  nottiOccupate: number
  capacita: number
  occupazione: number
  revpar: number
  adr: number
  numPrenotazioni: number
  durataMedia: number
  cancellazionePct: number
  revenuePerGiorno: number[]
  strutture: { nome: string; prenotazioni: number; notti: number; revenue: number }[]
  perFonte: { fonte: string; prenotazioni: number; revenue: number }[]
}

const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })

  // Header
  doc.rect(40, 40, 515, 60).fill(COL.primary)
  doc.fontSize(18).fillColor(COL.white).text(`Report Mensile — ${MESI[data.mese - 1]} ${data.anno}`, 55, 52)
  doc.fontSize(9).fillColor('#c7d2fe').text(`${data.nomeAzienda} · ${data.unitaTotali} unità · ${data.numGiorni} giorni`, 55, 76)

  // KPI Cards
  const kpiY = 120
  const kpis = [
    { label: 'Revenue', value: `€${Math.round(data.revenueTotale).toLocaleString('it-IT')}` },
    { label: 'Occupazione', value: `${data.occupazione}%` },
    { label: 'RevPAR', value: `€${data.revpar.toFixed(2)}` },
    { label: 'ADR', value: `€${data.adr.toFixed(2)}` },
    { label: 'Prenotazioni', value: String(data.numPrenotazioni) },
    { label: 'Durata media', value: `${data.durataMedia} notti` },
  ]

  const kpiW = 80
  const kpiGap = 6
  kpis.forEach((kpi, i) => {
    const x = 40 + i * (kpiW + kpiGap)
    doc.rect(x, kpiY, kpiW, 50).fill(COL.bg).stroke(COL.border)
    doc.fontSize(7).fillColor(COL.textLight).text(kpi.label.toUpperCase(), x + 6, kpiY + 8, { width: kpiW - 12 })
    doc.fontSize(14).fillColor(COL.text).text(kpi.value, x + 6, kpiY + 22, { width: kpiW - 12 })
  })

  // Revenue chart
  let y = kpiY + 70
  doc.fontSize(12).fillColor(COL.text).text('Revenue giornaliero', 40, y)
  y += 20
  const chartH = 60
  const maxRev = Math.max(...data.revenuePerGiorno, 1)
  const barW = 515 / data.revenuePerGiorno.length - 1

  data.revenuePerGiorno.forEach((rev, i) => {
    const h = Math.max((rev / maxRev) * chartH, 1)
    const x = 40 + i * (barW + 1)
    doc.rect(x, y + chartH - h, barW, h).fill(rev > 0 ? COL.primary : '#e5e7eb')
  })

  // Per struttura table
  y += chartH + 20
  if (data.strutture.length > 0) {
    doc.fontSize(12).fillColor(COL.text).text('Dettaglio per struttura', 40, y)
    y += 18

    // Header
    doc.rect(40, y, 515, 20).fill(COL.bg)
    doc.fontSize(7).fillColor(COL.textLight)
    doc.text('STRUTTURA', 46, y + 6, { width: 200 })
    doc.text('PREN.', 260, y + 6, { width: 60, align: 'right' })
    doc.text('NOTTI', 330, y + 6, { width: 60, align: 'right' })
    doc.text('REVENUE', 400, y + 6, { width: 150, align: 'right' })
    y += 22

    data.strutture.forEach(str => {
      doc.fontSize(9).fillColor(COL.text)
      doc.font('Helvetica-Bold').text(str.nome, 46, y, { width: 200 })
      doc.font('Helvetica').text(String(str.prenotazioni), 260, y, { width: 60, align: 'right' })
      doc.text(String(str.notti), 330, y, { width: 60, align: 'right' })
      doc.fillColor(COL.primary).font('Helvetica-Bold').text(`€${Math.round(str.revenue).toLocaleString('it-IT')}`, 400, y, { width: 150, align: 'right' })
      y += 16
      doc.moveTo(40, y - 2).lineTo(555, y - 2).strokeColor(COL.border).lineWidth(0.5).stroke()
    })
  }

  // Per fonte
  y += 10
  if (data.perFonte.length > 0) {
    doc.fontSize(12).fillColor(COL.text).font('Helvetica-Bold').text('Fonti prenotazione', 40, y)
    y += 18
    doc.font('Helvetica')

    data.perFonte.forEach(f => {
      const pct = data.revenueTotale > 0 ? Math.round((f.revenue / data.revenueTotale) * 100) : 0
      doc.fontSize(9).fillColor(COL.text).text(`${f.fonte}: ${f.prenotazioni} pren. — €${Math.round(f.revenue).toLocaleString('it-IT')} (${pct}%)`, 46, y)
      y += 14
    })
  }

  // Cancellazioni
  y += 10
  doc.fontSize(9).fillColor(COL.textLight).font('Helvetica')
  doc.text(`Tasso cancellazione/no-show: ${data.cancellazionePct}%`, 40, y)

  // Footer
  doc.fontSize(7).fillColor(COL.textMuted)
  doc.text('Otium Week · Report generato automaticamente', 40, 780, { width: 515, align: 'center' })

  return pdfToBuffer(doc)
}

// ─── Scheda Ospite PDF ────────────────────────────────────────────────────────

export interface SchedaOspiteData {
  nomeAzienda: string
  strutturaInfo: string
  partitaIva: string
  // Soggiorno
  checkIn: string
  checkOut: string
  notti: number
  unita: string
  numOspiti: number
  prezzo: string | null
  tassa: string | null
  // Titolare
  cognomeNome: string
  email: string
  telefono: string | null
  sesso: string | null
  dataNascita: string | null
  luogoNascita: string | null
  documento: string | null
  luogoRilascio: string | null
  // Accompagnatori
  accompagnatori: {
    cognomeNome: string
    sesso: string | null
    dataNascita: string | null
    nazionalita: string | null
    documento: string | null
    isMinore: boolean
  }[]
}

export async function generateSchedaOspitePdf(data: SchedaOspiteData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })

  // Header
  doc.rect(40, 40, 515, 3).fill(COL.primary)
  doc.fontSize(16).fillColor(COL.primary).font('Helvetica-Bold').text(data.nomeAzienda, 40, 55)
  doc.fontSize(8).fillColor(COL.textLight).font('Helvetica').text(data.strutturaInfo, 40, 75)
  if (data.partitaIva) doc.text(`P.IVA ${data.partitaIva}`, 40, 86)

  // Titolo
  doc.fontSize(14).fillColor(COL.text).font('Helvetica-Bold').text('Scheda Ospite', 40, 108)

  // Helper per campo
  let y = 130
  function field(label: string, value: string | null, bold = false) {
    if (!value) return
    doc.fontSize(8).fillColor(COL.textLight).font('Helvetica').text(label, 46, y, { width: 130, continued: false })
    doc.fontSize(9).fillColor(COL.text).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(value, 180, y)
    y += 15
  }

  function sectionTitle(title: string) {
    doc.rect(40, y, 515, 18).fill(COL.bg)
    doc.fontSize(9).fillColor(COL.text).font('Helvetica-Bold').text(title, 46, y + 4)
    y += 24
  }

  // Soggiorno
  sectionTitle('Soggiorno')
  field('Check-in', data.checkIn)
  field('Check-out', data.checkOut)
  field('Notti', String(data.notti))
  field('Camera / Unità', data.unita)
  field('N. ospiti', String(data.numOspiti))
  if (data.prezzo) field('Totale', data.prezzo, true)
  if (data.tassa) field('Tassa soggiorno', data.tassa)
  y += 6

  // Titolare
  sectionTitle('Ospite Titolare')
  field('Cognome e Nome', data.cognomeNome, true)
  field('Email', data.email)
  field('Telefono', data.telefono)
  field('Sesso', data.sesso === 'M' ? 'Maschio' : data.sesso === 'F' ? 'Femmina' : null)
  field('Data nascita', data.dataNascita)
  field('Luogo nascita', data.luogoNascita)
  field('Documento', data.documento)
  field('Rilasciato a', data.luogoRilascio)
  y += 6

  // Accompagnatori
  if (data.accompagnatori.length > 0) {
    sectionTitle(`Accompagnatori (${data.accompagnatori.length})`)
    data.accompagnatori.forEach((a, i) => {
      doc.fontSize(9).fillColor(COL.primary).font('Helvetica-Bold')
        .text(`${i + 1}. ${a.cognomeNome}${a.isMinore ? ' (minore)' : ''}`, 46, y)
      y += 14
      if (a.sesso) field('Sesso', a.sesso === 'M' ? 'Maschio' : 'Femmina')
      if (a.dataNascita) field('Data nascita', a.dataNascita)
      if (a.nazionalita) field('Nazionalità', a.nazionalita)
      if (a.documento) field('Documento', a.documento)
      y += 4
    })
  }

  // Firme
  y = Math.max(y + 20, 620)
  doc.moveTo(46, y).lineTo(240, y).strokeColor(COL.text).lineWidth(0.5).stroke()
  doc.moveTo(310, y).lineTo(510, y).stroke()
  doc.fontSize(8).fillColor(COL.textLight).font('Helvetica')
  doc.text('Firma Ospite', 46, y + 4, { width: 194, align: 'center' })
  doc.text('Firma Receptionist', 310, y + 4, { width: 200, align: 'center' })

  // Note legali
  y += 30
  doc.fontSize(6).fillColor(COL.textMuted).font('Helvetica')
  doc.text(
    "Ai sensi dell'art. 109 del T.U.L.P.S. (R.D. 773/1931) e dell'art. 7 del D.Lgs. 286/1998, " +
    "il gestore della struttura ricettiva è tenuto a comunicare alle autorità di P.S. le generalità delle persone alloggiate. " +
    "I dati personali saranno trattati nel rispetto del Regolamento UE 2016/679 (GDPR).",
    40, y, { width: 515, lineGap: 2 },
  )

  // Footer
  const now = new Date()
  doc.fontSize(7).fillColor(COL.textMuted)
  doc.text(`Documento generato il ${now.toLocaleDateString('it-IT')} ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} — ${data.nomeAzienda}`, 40, 780, { width: 515, align: 'center' })

  return pdfToBuffer(doc)
}

// ─── Conto Ospite (Folio) PDF ─────────────────────────────────────────────────

export interface ContoOspiteData {
  nomeAzienda: string
  strutturaInfo: string
  partitaIva: string
  telefono: string
  // Ospite
  cognomeNome: string
  email: string
  // Soggiorno
  checkIn: string
  checkOut: string
  notti: number
  unita: string
  // Addebiti
  voci: { data: string; descrizione: string; importo: number }[]
  subtotale: number
  tassaSoggiorno: number | null
  tassaSoggiornoDettaglio: string | null // es. "€2.50/notte × 3 notti × 2 ospiti"
  totale: number
  acconto: number
  saldo: number
}

export async function generateContoOspitePdf(data: ContoOspiteData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })

  // Header
  doc.rect(40, 40, 515, 3).fill(COL.primary)
  doc.fontSize(16).fillColor(COL.primary).font('Helvetica-Bold').text(data.nomeAzienda, 40, 55)
  doc.fontSize(8).fillColor(COL.textLight).font('Helvetica').text(data.strutturaInfo, 40, 75)
  if (data.partitaIva) doc.text(`P.IVA ${data.partitaIva}`, 40, 86)
  if (data.telefono) doc.text(`Tel. ${data.telefono}`, 40, 96)

  // Titolo
  doc.fontSize(14).fillColor(COL.text).font('Helvetica-Bold').text('Conto Ospite', 40, 118)

  // Info ospite + soggiorno (2 colonne)
  let y = 142
  doc.fontSize(8).fillColor(COL.textLight).font('Helvetica')
  doc.text('Ospite:', 46, y)
  doc.fontSize(9).fillColor(COL.text).font('Helvetica-Bold').text(data.cognomeNome, 100, y)
  doc.fontSize(8).fillColor(COL.textLight).font('Helvetica')
  doc.text('Camera:', 310, y)
  doc.fontSize(9).fillColor(COL.text).font('Helvetica-Bold').text(data.unita, 360, y)
  y += 15
  doc.fontSize(8).fillColor(COL.textLight).font('Helvetica')
  doc.text('Email:', 46, y)
  doc.fontSize(8).fillColor(COL.text).font('Helvetica').text(data.email, 100, y)
  doc.text('Periodo:', 310, y)
  doc.text(`${data.checkIn} → ${data.checkOut} (${data.notti} notti)`, 360, y)

  // Tabella voci
  y += 30
  doc.rect(40, y, 515, 20).fill(COL.primary)
  doc.fontSize(8).fillColor(COL.white).font('Helvetica-Bold')
  doc.text('DATA', 46, y + 6, { width: 80 })
  doc.text('DESCRIZIONE', 130, y + 6, { width: 280 })
  doc.text('IMPORTO', 420, y + 6, { width: 130, align: 'right' })
  y += 24

  doc.font('Helvetica').fillColor(COL.text)
  data.voci.forEach((v, i) => {
    const bgColor = i % 2 === 0 ? COL.white : COL.bg
    doc.rect(40, y - 2, 515, 16).fill(bgColor)
    doc.fontSize(8).fillColor(COL.textLight).text(v.data, 46, y, { width: 80 })
    doc.fillColor(COL.text).text(v.descrizione, 130, y, { width: 280 })
    doc.fillColor(COL.text).text(`€${v.importo.toFixed(2)}`, 420, y, { width: 130, align: 'right' })
    y += 16
  })

  // Totali
  y += 6
  doc.moveTo(350, y).lineTo(555, y).strokeColor(COL.border).lineWidth(0.5).stroke()
  y += 8

  function totalRow(label: string, value: string, bold = false) {
    doc.fontSize(9).fillColor(COL.textLight).font('Helvetica').text(label, 350, y, { width: 70, align: 'right' })
    doc.fillColor(COL.text).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(value, 420, y, { width: 130, align: 'right' })
    y += 16
  }

  totalRow('Subtotale', `€${data.subtotale.toFixed(2)}`)
  if (data.tassaSoggiorno && data.tassaSoggiorno > 0) {
    totalRow('Tassa soggiorno', `€${data.tassaSoggiorno.toFixed(2)}`)
    if (data.tassaSoggiornoDettaglio) {
      doc.fontSize(7).fillColor(COL.textMuted).text(data.tassaSoggiornoDettaglio, 350, y - 10, { width: 200, align: 'right' })
    }
  }
  doc.moveTo(350, y - 4).lineTo(555, y - 4).strokeColor(COL.text).lineWidth(1).stroke()
  totalRow('TOTALE', `€${data.totale.toFixed(2)}`, true)
  if (data.acconto > 0) {
    totalRow('Acconto versato', `- €${data.acconto.toFixed(2)}`)
    doc.moveTo(350, y - 4).lineTo(555, y - 4).strokeColor(COL.text).lineWidth(0.5).stroke()
    doc.fontSize(11).fillColor(data.saldo > 0 ? '#dc2626' : COL.success).font('Helvetica-Bold')
    doc.text(data.saldo > 0 ? `Saldo: €${data.saldo.toFixed(2)}` : 'SALDATO', 350, y, { width: 200, align: 'right' })
  }

  // Footer
  doc.fontSize(7).fillColor(COL.textMuted).font('Helvetica')
  doc.text(`${data.nomeAzienda} · Documento non fiscale`, 40, 770, { width: 515, align: 'center' })
  doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, 40, 780, { width: 515, align: 'center' })

  return pdfToBuffer(doc)
}
