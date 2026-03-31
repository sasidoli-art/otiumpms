import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfDay } from 'date-fns'

const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { backgroundColor: '#4f46e5', padding: 20, borderRadius: 6, marginBottom: 24 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#c7d2fe', fontSize: 10, marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kpiCard: { flex: 1, backgroundColor: '#f9fafb', padding: 14, borderRadius: 6, border: '1 solid #e5e7eb' },
  kpiLabel: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 4 },
  kpiDelta: { fontSize: 8, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 10, marginTop: 16 },
  tableHead: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 4, padding: 8, marginBottom: 4 },
  tableHeadCell: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottom: '1 solid #f3f4f6' },
  tableCell: { fontSize: 10, color: '#374151' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 80, marginBottom: 8 },
  chartBar: { backgroundColor: '#6366f1', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#9ca3af' },
  forecastBox: { backgroundColor: '#eef2ff', padding: 14, borderRadius: 6, marginTop: 16 },
  forecastTitle: { fontSize: 11, fontWeight: 'bold', color: '#4338ca', marginBottom: 6 },
  forecastText: { fontSize: 10, color: '#4338ca' },
})

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

  // Calculate metrics
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

    // Daily revenue
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

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Report Mensile — {MESI[mese - 1]} {anno}</Text>
          <Text style={s.headerSub}>{host?.nomeAzienda ?? ''} · {unitaTotali} unità · {numGiorni} giorni</Text>
        </View>

        {/* KPI */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Revenue</Text>
            <Text style={s.kpiValue}>€{Math.round(revenueTotale).toLocaleString('it-IT')}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Occupazione</Text>
            <Text style={s.kpiValue}>{occupazione}%</Text>
            <Text style={{ fontSize: 8, color: '#6b7280' }}>{nottiOccupate} / {capacita} notti</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>RevPAR</Text>
            <Text style={s.kpiValue}>€{revpar.toFixed(2)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Prenotazioni</Text>
            <Text style={s.kpiValue}>{prenotazioni.length}</Text>
          </View>
        </View>

        {/* Revenue chart (simplified bar representation) */}
        <Text style={s.sectionTitle}>Revenue giornaliero</Text>
        <View style={s.chartRow}>
          {revenueGiornaliero.map((rev, i) => (
            <View
              key={i}
              style={[s.chartBar, {
                flex: 1,
                height: `${Math.max((rev / maxRev) * 100, 2)}%`,
                opacity: rev > 0 ? 1 : 0.2,
              }]}
            />
          ))}
        </View>

        {/* Per struttura table */}
        {strutture.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Dettaglio per struttura</Text>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Struttura</Text>
              <Text style={[s.tableHeadCell, { flex: 1, textAlign: 'right' }]}>Pren.</Text>
              <Text style={[s.tableHeadCell, { flex: 1, textAlign: 'right' }]}>Notti</Text>
              <Text style={[s.tableHeadCell, { flex: 2, textAlign: 'right' }]}>Revenue</Text>
            </View>
            {strutture.map((str, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 3, fontWeight: 'bold' }]}>{str.nome}</Text>
                <Text style={[s.tableCell, { flex: 1, textAlign: 'right' }]}>{str.prenotazioni}</Text>
                <Text style={[s.tableCell, { flex: 1, textAlign: 'right' }]}>{str.notti}</Text>
                <Text style={[s.tableCell, { flex: 2, textAlign: 'right', color: '#4f46e5', fontWeight: 'bold' }]}>
                  €{Math.round(str.revenue).toLocaleString('it-IT')}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Otium Week · Report generato automaticamente</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report_${anno}_${String(mese).padStart(2, '0')}.pdf"`,
    },
  })
}
