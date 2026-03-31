import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * GET /api/host/prenotazioni/[id]/regcard
 * Genera la scheda di registrazione ospite PDF (Registration Card)
 * Conforme art. 109 TULPS per identificazione in reception.
 */
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const pren = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    include: {
      struttura: { select: { nome: true, indirizzo: true, citta: true } },
      unita: { select: { nome: true } },
      host: { select: { nomeAzienda: true, partitaIva: true, telefono: true } },
      accompagnatori: true,
    },
  })

  if (!pren) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RPdf = require('@react-pdf/renderer')
    const { Document, Page, Text, View, StyleSheet: SS, renderToBuffer: rtb } = RPdf
    const e = React.createElement

    const s = SS.create({
      page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#1f2937' },
      header: { borderBottom: '2 solid #4f46e5', paddingBottom: 12, marginBottom: 16 },
      title: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
      subtitle: { fontSize: 9, color: '#6b7280', marginTop: 2 },
      section: { marginBottom: 12 },
      sectionTitle: { fontSize: 10, fontWeight: 'bold', backgroundColor: '#f3f4f6', padding: 6, borderRadius: 3, marginBottom: 6 },
      row: { flexDirection: 'row', marginBottom: 3 },
      label: { width: 140, color: '#6b7280', fontSize: 9 },
      value: { flex: 1, fontWeight: 'bold', fontSize: 9 },
      divider: { borderBottom: '1 solid #e5e7eb', marginVertical: 8 },
      accTitle: { fontSize: 9, fontWeight: 'bold', color: '#4f46e5', marginTop: 8, marginBottom: 4 },
      sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
      sigBox: { width: 200, borderTop: '1 solid #000', paddingTop: 4, fontSize: 8, textAlign: 'center' },
      footer: { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 7, color: '#9ca3af', textAlign: 'center' },
      legal: { fontSize: 7, color: '#9ca3af', marginTop: 16, lineHeight: 1.4 },
    })

    const fmtDate = (d: Date | null) => d ? format(new Date(d), 'd MMMM yyyy', { locale: it }) : '—'
    const notti = pren.dataPartenza
      ? Math.round((new Date(pren.dataPartenza).getTime() - new Date(pren.dataArrivo).getTime()) / 86400000)
      : 1

    const TIPI_DOC: Record<string, string> = { PPORT: 'Passaporto', IDENTE: "Carta d'identità", PATEN: 'Patente', PERMSOS: 'Permesso soggiorno' }

    const field = (label: string, value: string) =>
      e(View, { style: s.row, key: label },
        e(Text, { style: s.label }, label),
        e(Text, { style: s.value }, value),
      )

    const accBlocks = (pren.accompagnatori || []).map((a: { nome: string; cognome: string; sesso: string | null; dataNascita: Date | null; nazionalita: string | null; tipoDocumento: string | null; numeroDocumento: string | null; isMinore: boolean }, i: number) =>
      e(View, { key: `acc-${i}` },
        e(Text, { style: s.accTitle }, `Accompagnatore ${i + 1}${a.isMinore ? ' (minore)' : ''}`),
        field('Cognome e Nome', `${a.cognome} ${a.nome}`),
        a.sesso ? field('Sesso', a.sesso === 'M' ? 'Maschio' : 'Femmina') : null,
        a.dataNascita ? field('Data nascita', fmtDate(a.dataNascita)) : null,
        a.nazionalita ? field('Nazionalità', a.nazionalita) : null,
        a.tipoDocumento ? field('Documento', `${TIPI_DOC[a.tipoDocumento] || a.tipoDocumento} ${a.numeroDocumento || ''}`) : null,
      ),
    )

    const doc = e(Document, null,
      e(Page, { size: 'A4', style: s.page },
        // Header
        e(View, { style: s.header },
          e(Text, { style: s.title }, pren.host?.nomeAzienda || 'Struttura'),
          e(Text, { style: s.subtitle }, [pren.struttura?.nome, pren.struttura?.indirizzo, pren.struttura?.citta].filter(Boolean).join(' — ')),
          e(Text, { style: s.subtitle }, pren.host?.partitaIva ? `P.IVA ${pren.host.partitaIva}` : ''),
        ),
        // Titolo
        e(Text, { style: { fontSize: 13, fontWeight: 'bold', marginBottom: 12 } }, 'Scheda di Registrazione Ospite'),
        // Soggiorno
        e(View, { style: s.section },
          e(Text, { style: s.sectionTitle }, 'Soggiorno'),
          field('Check-in', fmtDate(pren.dataArrivo)),
          field('Check-out', fmtDate(pren.dataPartenza)),
          field('Notti', String(notti)),
          field('Camera / Unità', pren.unita?.nome || '—'),
          field('N. ospiti', String(pren.numOspiti)),
          pren.prezzoTotale ? field('Totale', `€${pren.prezzoTotale.toFixed(2)}`) : null,
          pren.tassaSoggiorno ? field('Tassa soggiorno', `€${pren.tassaSoggiorno.toFixed(2)}/notte`) : null,
        ),
        // Ospite titolare
        e(View, { style: s.section },
          e(Text, { style: s.sectionTitle }, 'Ospite Titolare'),
          field('Cognome e Nome', `${pren.guestCognome} ${pren.guestNome}`),
          field('Email', pren.guestEmail),
          pren.guestTelefono ? field('Telefono', pren.guestTelefono) : null,
          pren.guestSesso ? field('Sesso', pren.guestSesso === 'M' ? 'Maschio' : 'Femmina') : null,
          pren.guestDataNascita ? field('Data nascita', fmtDate(pren.guestDataNascita)) : null,
          pren.guestLuogoNascita ? field('Luogo nascita', `${pren.guestLuogoNascita}${pren.guestProvinciaNascita ? ` (${pren.guestProvinciaNascita})` : ''}`) : null,
          pren.guestTipoDocumento ? field('Documento', `${TIPI_DOC[pren.guestTipoDocumento] || pren.guestTipoDocumento} n. ${pren.guestNumeroDocumento || '—'}`) : null,
          pren.guestLuogoRilascio ? field('Rilasciato a', `${pren.guestLuogoRilascio}${pren.guestProvinciaRilascio ? ` (${pren.guestProvinciaRilascio})` : ''}`) : null,
        ),
        // Accompagnatori
        ...(accBlocks.length > 0 ? [
          e(View, { style: s.section, key: 'acc-section' },
            e(Text, { style: s.sectionTitle }, `Accompagnatori (${accBlocks.length})`),
            ...accBlocks,
          ),
        ] : []),
        // Firma
        e(View, { style: s.sigRow },
          e(View, { style: s.sigBox }, e(Text, null, 'Firma Ospite')),
          e(View, { style: s.sigBox }, e(Text, null, 'Firma Receptionist')),
        ),
        // Note legali
        e(Text, { style: s.legal },
          'Ai sensi dell\'art. 109 del T.U.L.P.S. (R.D. 773/1931) e dell\'art. 7 del D.Lgs. 286/1998, ' +
          'il gestore della struttura ricettiva è tenuto a comunicare alle autorità di P.S. le generalità delle persone alloggiate. ' +
          'I dati personali saranno trattati nel rispetto del Regolamento UE 2016/679 (GDPR).',
        ),
        // Footer
        e(View, { style: s.footer, fixed: true },
          e(Text, null, `Documento generato il ${format(new Date(), 'd/MM/yyyy HH:mm')} — ${pren.host?.nomeAzienda || ''}`),
        ),
      ),
    )

    const pdf = await rtb(doc)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="regcard_${pren.guestCognome}_${pren.guestNome}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Regcard PDF error:', err)
    return NextResponse.json({ error: 'Errore generazione PDF' }, { status: 500 })
  }
}
