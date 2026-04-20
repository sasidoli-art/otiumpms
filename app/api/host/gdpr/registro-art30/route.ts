import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { RETENTION_POLICIES } from '@/lib/gdpr-retention'

/**
 * GET /api/host/gdpr/registro-art30
 * Genera PDF del Registro delle attività di trattamento (Art. 30 GDPR).
 */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { nomeAzienda: true, partitaIva: true, indirizzo: true, citta: true, cap: true, provincia: true },
  })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  // Header
  doc.fontSize(18).fillColor('#1f2937').text('Registro delle attività di trattamento', { align: 'center' })
  doc.fontSize(10).fillColor('#6b7280').text('Art. 30 Reg. UE 2016/679 (GDPR)', { align: 'center' })
  doc.moveDown(1.5)

  // Titolare
  doc.fontSize(11).fillColor('#1f2937').text('Titolare del trattamento', { underline: true })
  doc.moveDown(0.3)
  doc.fontSize(10).fillColor('#374151')
  doc.text(host.nomeAzienda)
  if (host.partitaIva) doc.text(`P.IVA: ${host.partitaIva}`)
  const addr = [host.indirizzo, `${host.cap ?? ''} ${host.citta ?? ''} ${host.provincia ?? ''}`.trim()]
    .filter(Boolean).join(' — ')
  if (addr) doc.text(addr)
  doc.moveDown(1)

  // Tabella trattamenti
  doc.fontSize(11).fillColor('#1f2937').text('Attività di trattamento', { underline: true })
  doc.moveDown(0.5)

  for (const p of RETENTION_POLICIES) {
    if (doc.y > 720) doc.addPage()
    doc.fontSize(10).fillColor('#1f2937').text(p.descrizione, { continued: false })
    doc.fontSize(8).fillColor('#6b7280')
    doc.text(`Entità: ${p.entita}`)
    doc.text(`Base giuridica: ${p.baseGiuridica.replace('_', ' ')}`)
    if (p.riferimentoNormativo) doc.text(`Riferimento normativo: ${p.riferimentoNormativo}`)
    doc.text(
      `Periodo di conservazione: ${p.giorniRetention} giorni — azione: ${p.azione === 'anonimizza' ? 'anonimizzazione' : 'cancellazione'}`,
    )
    doc.moveDown(0.6)
  }

  // Footer
  doc.moveDown(1)
  doc.fontSize(8).fillColor('#9ca3af')
  doc.text(
    `Generato il ${new Date().toLocaleDateString('it-IT')} — documento valido come snapshot alla data di emissione. Verificare periodicamente l'aggiornamento delle policy.`,
    { align: 'center' },
  )

  doc.end()
  const buffer = await done

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="registro-art30-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
