import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import PDFDocument from 'pdfkit'
import { DEFAULT_REGCARD_IT, compileRegCardText } from '@/lib/regcard-defaults'

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

/**
 * GET /api/host/prenotazioni/[id]/regcard-pdf
 * Genera PDF della Registration Card firmata
 */
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      guestTelefono: true,
      guestSesso: true,
      guestDataNascita: true,
      guestLuogoNascita: true,
      guestTipoDocumento: true,
      guestNumeroDocumento: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      prezzoTotale: true,
      regCardFirmata: true,
      regCardFirmaBase64: true,
      regCardAccTermini: true,
      regCardAccPrivacy: true,
      regCardAccMarketing: true,
      regCardDataFirma: true,
      struttura: { select: { nome: true } },
      unita: { select: { nome: true } },
      host: {
        select: {
          nomeAzienda: true,
          indirizzo: true,
          citta: true,
          provincia: true,
          cap: true,
          telefono: true,
          partitaIva: true,
          regCardTerminiHtml: true,
        },
      },
    },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  const h = prenotazione.host
  const doc = new PDFDocument({ size: 'A4', margin: 40 })

  // ── Header ──
  doc.fontSize(16).fillColor('#1e293b').text(h?.nomeAzienda ?? 'Hotel', { align: 'center' })
  doc.fontSize(8).fillColor('#64748b')
  if (h?.indirizzo) doc.text(`${h.indirizzo}, ${h.cap ?? ''} ${h.citta ?? ''} (${h.provincia ?? ''})`, { align: 'center' })
  if (h?.telefono) doc.text(`Tel: ${h.telefono}`, { align: 'center' })
  if (h?.partitaIva) doc.text(`P.IVA: ${h.partitaIva}`, { align: 'center' })

  doc.moveDown(1)
  doc.fontSize(14).fillColor('#1e40af').text('REGISTRATION CARD', { align: 'center' })
  doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).strokeColor('#cbd5e1').lineWidth(1).stroke()
  doc.moveDown(1)

  // ── Dati ospite ──
  doc.fontSize(9).fillColor('#334155')
  const col1 = 40, col2 = 300
  const fmtDate = (d: Date | null) => d ? d.toLocaleDateString('it-IT') : '—'

  doc.text('OSPITE', col1, doc.y, { underline: true })
  doc.moveDown(0.3)
  const guestY = doc.y
  doc.text(`Nome: ${prenotazione.guestNome} ${prenotazione.guestCognome}`, col1, guestY)
  doc.text(`Email: ${prenotazione.guestEmail}`, col1, guestY + 12)
  doc.text(`Telefono: ${prenotazione.guestTelefono ?? '—'}`, col1, guestY + 24)
  doc.text(`Sesso: ${prenotazione.guestSesso ?? '—'}`, col1, guestY + 36)
  doc.text(`Data nascita: ${fmtDate(prenotazione.guestDataNascita)}`, col1, guestY + 48)
  doc.text(`Luogo nascita: ${prenotazione.guestLuogoNascita ?? '—'}`, col1, guestY + 60)

  doc.text('DOCUMENTO', col2, guestY, { underline: true })
  doc.text(`Tipo: ${prenotazione.guestTipoDocumento ?? '—'}`, col2, guestY + 12)
  doc.text(`Numero: ${prenotazione.guestNumeroDocumento ?? '—'}`, col2, guestY + 24)

  doc.text('SOGGIORNO', col2, guestY + 48, { underline: true })
  doc.text(`Arrivo: ${fmtDate(prenotazione.dataArrivo)}`, col2, guestY + 60)
  doc.text(`Partenza: ${fmtDate(prenotazione.dataPartenza)}`, col2, guestY + 72)
  doc.text(`Ospiti: ${prenotazione.numOspiti}`, col2, guestY + 84)
  doc.text(`Struttura: ${prenotazione.struttura?.nome ?? '—'}`, col2, guestY + 96)
  if (prenotazione.unita) doc.text(`Camera: ${prenotazione.unita.nome}`, col2, guestY + 108)

  doc.y = guestY + 125
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
  doc.moveDown(1)

  // ── T&C ──
  doc.fontSize(8).fillColor('#475569').text('TERMINI E CONDIZIONI', col1, doc.y, { underline: true })
  doc.moveDown(0.3)

  const termsText = h?.regCardTerminiHtml
    ? h.regCardTerminiHtml
    : compileRegCardText(DEFAULT_REGCARD_IT, {
        nomeHotel: h?.nomeAzienda ?? 'Hotel',
        cittaForo: h?.citta ?? 'competente',
      })

  doc.fontSize(7).fillColor('#64748b')
  doc.text(termsText, col1, doc.y, {
    width: 515,
    lineGap: 2,
  })

  doc.moveDown(1)

  // ── Consensi ──
  doc.fontSize(8).fillColor('#334155')
  doc.text(`☑ Accettazione Termini e Condizioni: ${prenotazione.regCardAccTermini ? 'SÌ' : 'NO'}`)
  doc.text(`☑ Accettazione Privacy (GDPR): ${prenotazione.regCardAccPrivacy ? 'SÌ' : 'NO'}`)
  doc.text(`☐ Consenso Marketing: ${prenotazione.regCardAccMarketing ? 'SÌ' : 'NO'}`)

  doc.moveDown(1)

  // ── Firma ──
  if (prenotazione.regCardFirmaBase64) {
    doc.fontSize(8).fillColor('#334155').text('FIRMA OSPITE:', col1, doc.y)
    doc.moveDown(0.3)
    try {
      // La firma è un data URL base64 (image/png)
      const base64Data = prenotazione.regCardFirmaBase64.replace(/^data:image\/\w+;base64,/, '')
      const imgBuffer = Buffer.from(base64Data, 'base64')
      doc.image(imgBuffer, col1, doc.y, { width: 200, height: 60 })
      doc.y += 65
    } catch {
      doc.text('[Firma digitale salvata nel sistema]', col1, doc.y)
    }
  } else {
    doc.fontSize(8).fillColor('#94a3b8').text('[Registration Card non firmata]', col1, doc.y)
  }

  doc.moveDown(0.5)
  doc.fontSize(7).fillColor('#94a3b8')
  doc.text(`Data firma: ${prenotazione.regCardDataFirma ? fmtDate(prenotazione.regCardDataFirma) : '—'}`)
  doc.text(`ID Prenotazione: ${prenotazione.id}`)

  // ── Footer ──
  doc.fontSize(6).fillColor('#cbd5e1')
  doc.text(`${h?.nomeAzienda ?? 'Hotel'} · Registration Card · Generato da Otium Week`, 40, 790, { align: 'center', width: 515 })

  const buffer = await pdfToBuffer(doc)

  const filename = `RegCard_${prenotazione.guestCognome}_${prenotazione.guestNome}_${prenotazione.dataArrivo.toISOString().split('T')[0]}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
