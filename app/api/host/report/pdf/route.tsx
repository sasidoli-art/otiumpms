import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfDay } from 'date-fns'

const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const anno = parseInt(sp.get('anno') ?? String(new Date().getFullYear()))
  const mese = parseInt(sp.get('mese') ?? String(new Date().getMonth() + 1))

  if (isNaN(anno) || isNaN(mese) || mese < 1 || mese > 12) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
  }

  const hostId = auth.user.hostId

  const [host, unitaTotali] = await Promise.all([
    prisma.host.findUnique({ where: { id: hostId }, select: { nomeAzienda: true } }),
    prisma.unitaPrenotabile.count({ where: { struttura: { hostId } } }),
  ])

  const inizioMese = startOfMonth(new Date(anno, mese - 1, 1))
  const fineMese = endOfMonth(new Date(anno, mese - 1, 1))
  const giorniMese = eachDayOfInterval({ start: inizioMese, end: fineMese })
  const numGiorni = giorniMese.length

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      OR: [
        { dataArrivo: { gte: inizioMese, lte: fineMese } },
        { dataPartenza: { gte: inizioMese, lte: fineMese } },
        { dataArrivo: { lte: inizioMese }, dataPartenza: { gte: fineMese } },
      ],
    },
    include: { struttura: { select: { id: true, nome: true } } },
  })

  let nottiOccupate = 0
  let revenueTotale = 0
  const perStruttura: Record<string, { nome: string; prenotazioni: number; notti: number; revenue: number }> = {}
  const revenueGiornaliero = giorniMese.map(() => 0)

  for (const p of prenotazioni) {
    const arrivo = startOfDay(new Date(p.dataArrivo))
    const partenza = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : fineMese
    const start = arrivo < inizioMese ? inizioMese : arrivo
    const end = partenza > fineMese ? fineMese : partenza
    const notti = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
    nottiOccupate += notti

    const nottiTotali = p.dataPartenza
      ? Math.round((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000)
      : notti
    const rev = p.prezzoTotale && nottiTotali > 0 ? (p.prezzoTotale * notti) / nottiTotali : 0
    revenueTotale += rev

    if (p.struttura) {
      const sid = p.struttura.id
      if (!perStruttura[sid]) perStruttura[sid] = { nome: p.struttura.nome, prenotazioni: 0, notti: 0, revenue: 0 }
      perStruttura[sid].prenotazioni++
      perStruttura[sid].notti += notti
      perStruttura[sid].revenue += rev
    }

    for (let i = 0; i < giorniMese.length; i++) {
      const g = giorniMese[i]
      if (arrivo <= g && partenza > g && p.prezzoTotale && nottiTotali > 0) {
        revenueGiornaliero[i] += p.prezzoTotale / nottiTotali
      }
    }
  }

  const capacita = unitaTotali * numGiorni
  const occupazione = capacita > 0 ? Math.round((nottiOccupate / capacita) * 1000) / 10 : 0
  const revpar = unitaTotali > 0 ? Math.round((revenueTotale / capacita) * 100) / 100 : 0
  const maxRev = Math.max(...revenueGiornaliero, 1)
  const strutture = Object.values(perStruttura).sort((a, b) => b.revenue - a.revenue)
  const nomeAzienda = host?.nomeAzienda ?? 'Otium Week'

  try {
    // Require at runtime per evitare che Turbopack trasformi il JSX di @react-pdf
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RPdf = require('@react-pdf/renderer')
    const { Document, Page, Text, View, StyleSheet: SS, renderToBuffer: rtb } = RPdf

    const s = SS.create({
      page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2937' },
      header: { backgroundColor: '#4f46e5', padding: 20, borderRadius: 6, marginBottom: 24 },
      headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
      headerSub: { color: '#c7d2fe', fontSize: 10, marginTop: 4 },
      kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
      kpiCard: { flex: 1, backgroundColor: '#f9fafb', padding: 14, borderRadius: 6, border: '1 solid #e5e7eb' },
      kpiLabel: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
      kpiValue: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 4 },
      sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 10, marginTop: 16 },
      tableHead: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 4, padding: 8, marginBottom: 4 },
      tableHeadCell: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' },
      tableRow: { flexDirection: 'row', padding: 8, borderBottom: '1 solid #f3f4f6' },
      tableCell: { fontSize: 10, color: '#374151' },
      chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 80, marginBottom: 8 },
      chartBar: { backgroundColor: '#6366f1', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
      footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
      footerText: { fontSize: 8, color: '#9ca3af' },
    })

    const e = React.createElement

    const pageChildren = [
      e(View, { style: s.header, key: 'h' },
        e(Text, { style: s.headerTitle }, `Report Mensile \u2014 ${MESI[mese - 1]} ${anno}`),
        e(Text, { style: s.headerSub }, `${nomeAzienda} \u00b7 ${unitaTotali} unit\u00e0 \u00b7 ${numGiorni} giorni`),
      ),
      e(View, { style: s.kpiRow, key: 'k' },
        e(View, { style: s.kpiCard },
          e(Text, { style: s.kpiLabel }, 'Revenue'),
          e(Text, { style: s.kpiValue }, `\u20ac${Math.round(revenueTotale).toLocaleString('it-IT')}`),
        ),
        e(View, { style: s.kpiCard },
          e(Text, { style: s.kpiLabel }, 'Occupazione'),
          e(Text, { style: s.kpiValue }, `${occupazione}%`),
          e(Text, { style: { fontSize: 8, color: '#6b7280' } }, `${nottiOccupate} / ${capacita} notti`),
        ),
        e(View, { style: s.kpiCard },
          e(Text, { style: s.kpiLabel }, 'RevPAR'),
          e(Text, { style: s.kpiValue }, `\u20ac${revpar.toFixed(2)}`),
        ),
        e(View, { style: s.kpiCard },
          e(Text, { style: s.kpiLabel }, 'Prenotazioni'),
          e(Text, { style: s.kpiValue }, String(prenotazioni.length)),
        ),
      ),
      e(Text, { style: s.sectionTitle, key: 'ct' }, 'Revenue giornaliero'),
      e(View, { style: s.chartRow, key: 'c' },
        ...revenueGiornaliero.map((rev, i) =>
          e(View, { key: `b${i}`, style: [s.chartBar, { flex: 1, height: `${Math.max((rev / maxRev) * 100, 2)}%`, opacity: rev > 0 ? 1 : 0.2 }] }),
        ),
      ),
    ]

    if (strutture.length > 0) {
      pageChildren.push(
        e(Text, { style: s.sectionTitle, key: 'st' }, 'Dettaglio per struttura'),
        e(View, { style: s.tableHead, key: 'sh' },
          e(Text, { style: [s.tableHeadCell, { flex: 3 }] }, 'Struttura'),
          e(Text, { style: [s.tableHeadCell, { flex: 1, textAlign: 'right' }] }, 'Pren.'),
          e(Text, { style: [s.tableHeadCell, { flex: 1, textAlign: 'right' }] }, 'Notti'),
          e(Text, { style: [s.tableHeadCell, { flex: 2, textAlign: 'right' }] }, 'Revenue'),
        ),
        ...strutture.map((str, i) =>
          e(View, { key: `s${i}`, style: s.tableRow },
            e(Text, { style: [s.tableCell, { flex: 3, fontWeight: 'bold' }] }, str.nome),
            e(Text, { style: [s.tableCell, { flex: 1, textAlign: 'right' }] }, String(str.prenotazioni)),
            e(Text, { style: [s.tableCell, { flex: 1, textAlign: 'right' }] }, String(str.notti)),
            e(Text, { style: [s.tableCell, { flex: 2, textAlign: 'right', color: '#4f46e5', fontWeight: 'bold' }] }, `\u20ac${Math.round(str.revenue).toLocaleString('it-IT')}`),
          ),
        ),
      )
    }

    pageChildren.push(
      e(View, { style: s.footer, fixed: true, key: 'f' },
        e(Text, { style: s.footerText }, 'Otium Week \u00b7 Report generato automaticamente'),
        e(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
      ),
    )

    const doc = e(Document, null, e(Page, { size: 'A4', style: s.page }, ...pageChildren))
    const pdf = await rtb(doc)

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report_${anno}_${String(mese).padStart(2, '0')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Errore generazione PDF' }, { status: 500 })
  }
}
