'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Banknote,
  Plus,
  X,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Loader2,
  Receipt,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { cn, formatValuta } from '@/lib/utils'



// ── Types ──────────────────────────────────────────────────────
type MetodoPagamento = 'CONTANTI' | 'CARTA' | 'BONIFICO' | 'GIFT_CARD' | 'CAMERA'
type TipoCarta = 'VISA' | 'MASTERCARD' | 'AMEX' | 'BANCOMAT'

interface Incasso {
  id: string
  data: string
  ora: string
  importo: number
  metodo: MetodoPagamento
  tipoCarta?: TipoCarta | null
  ultime4Cifre?: string | null
  operatore: string
  descrizione: string
  origine: string
  note?: string | null
  createdAt: string
}

interface ChiusuraCassa {
  id: string
  data: string
  turno: string
  fondoCassaInizio: number
  fondoCassaFine: number
  totaleContanti: number
  totaleCarta: number
  totaleBonifico: number
  totaleGiftCard: number
  totaleCamera: number
  differenza: number
  operatore: string
  note?: string | null
  createdAt: string
}

interface ReportData {
  totale: number
  mediaGiornaliera: number
  numTransazioni: number
  perMetodo: Record<MetodoPagamento, number>
  perTipoCarta: Record<string, number>
  perOrigine: Record<string, number>
  perOperatore: { operatore: string; numIncassi: number; totale: number }[]
  trendGiornaliero: { data: string; totale: number; contanti: number; carta: number }[]
  chiusureConDifferenza: ChiusuraCassa[]
}

// ── Constants ──────────────────────────────────────────────────
const METODI: { value: MetodoPagamento; label: string; icon: string; color: string; bgColor: string }[] = [
  { value: 'CONTANTI',  label: 'Contanti',  icon: '💵', color: 'text-green-700',  bgColor: 'bg-green-50 border-green-200' },
  { value: 'CARTA',     label: 'Carta',     icon: '💳', color: 'text-blue-700',   bgColor: 'bg-blue-50 border-blue-200' },
  { value: 'BONIFICO',  label: 'Bonifico',  icon: '🏦', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  { value: 'GIFT_CARD', label: 'Gift Card', icon: '🎁', color: 'text-amber-700',  bgColor: 'bg-amber-50 border-amber-200' },
  { value: 'CAMERA',    label: 'Camera',    icon: '🏨', color: 'text-slate-700',  bgColor: 'bg-slate-50 border-slate-200' },
]

const TIPI_CARTA: { value: TipoCarta; label: string; color: string }[] = [
  { value: 'VISA',       label: 'Visa',       color: 'bg-indigo-100 text-indigo-700' },
  { value: 'MASTERCARD', label: 'Mastercard', color: 'bg-red-100 text-red-700' },
  { value: 'AMEX',       label: 'Amex',       color: 'bg-blue-100 text-blue-700' },
  { value: 'BANCOMAT',   label: 'Bancomat',   color: 'bg-green-100 text-green-700' },
]

const ORIGINI = [
  'Prenotazione',
  'SPA',
  'Ristorazione',
  'Minibar',
  'Parcheggio',
  'Extra',
  'Altro',
]

const metodoBadge = (metodo: MetodoPagamento) => {
  const m = METODI.find(mm => mm.value === metodo)
  if (!m) return 'bg-gray-100 text-gray-700'
  return m.bgColor + ' ' + m.color
}

const tipoCartaBadge = (tipo: TipoCarta) => {
  const t = TIPI_CARTA.find(tt => tt.value === tipo)
  return t?.color ?? 'bg-gray-100 text-gray-700'
}

const metodoLabel = (metodo: MetodoPagamento) => METODI.find(m => m.value === metodo)?.label ?? metodo
const tipoCartaLabel = (tipo: TipoCarta) => TIPI_CARTA.find(t => t.value === tipo)?.label ?? tipo

// ── Component ──────────────────────────────────────────────────
export default function CassaManager({ nomeOperatore }: { nomeOperatore: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'incassi' | 'chiusura' | 'report'>('incassi')

  // ── Tab 1: Incassi state ──
  const [dataIncassi, setDataIncassi] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [incassi, setIncassi] = useState<Incasso[]>([])
  const [loadingIncassi, setLoadingIncassi] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // ── Tab 2: Chiusura state ──
  const [dataChiusura, setDataChiusura] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [chiusure, setChiusure] = useState<ChiusuraCassa[]>([])
  const [loadingChiusure, setLoadingChiusure] = useState(false)
  const [chiusuraGiaFatta, setChiusuraGiaFatta] = useState(false)

  // ── Tab 3: Report state ──
  const [reportDa, setReportDa] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [reportA, setReportA] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [report, setReport] = useState<ReportData | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // ── Fetch incassi ──
  const fetchIncassi = useCallback(async () => {
    setLoadingIncassi(true)
    try {
      const res = await fetch(`/api/host/cassa/incassi?data=${dataIncassi}`)
      if (res.ok) {
        const data = await res.json()
        setIncassi(Array.isArray(data) ? data : data.incassi ?? [])
      }
    } catch (err) { console.error(err) } finally { setLoadingIncassi(false) }
  }, [dataIncassi])

  // ── Fetch chiusure ──
  const fetchChiusure = useCallback(async () => {
    setLoadingChiusure(true)
    try {
      const res = await fetch(`/api/host/cassa/chiusura?data=${dataChiusura}`)
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.chiusure ?? []
        setChiusure(list)
        setChiusuraGiaFatta(list.some((c: ChiusuraCassa) => c.data === dataChiusura))
      }
    } catch (err) { console.error(err) } finally { setLoadingChiusure(false) }
  }, [dataChiusura])

  // ── Fetch report ──
  const fetchReport = useCallback(async () => {
    setLoadingReport(true)
    try {
      const res = await fetch(`/api/host/cassa/report?da=${reportDa}&a=${reportA}`)
      if (res.ok) setReport(await res.json())
    } catch (err) { console.error(err) } finally { setLoadingReport(false) }
  }, [reportDa, reportA])

  useEffect(() => { if (tab === 'incassi') fetchIncassi() }, [tab, fetchIncassi])
  useEffect(() => { if (tab === 'chiusura') fetchChiusure() }, [tab, fetchChiusure])
  useEffect(() => { if (tab === 'report') fetchReport() }, [tab, fetchReport])

  // ── KPIs for incassi ──
  const kpiIncassi = useMemo(() => {
    const totale = incassi.reduce((s, i) => s + i.importo, 0)
    const perMetodo: Record<MetodoPagamento, number> = {
      CONTANTI: 0, CARTA: 0, BONIFICO: 0, GIFT_CARD: 0, CAMERA: 0,
    }
    incassi.forEach(i => { perMetodo[i.metodo] = (perMetodo[i.metodo] ?? 0) + i.importo })
    return { totale, ...perMetodo }
  }, [incassi])

  // ── Tabs ──
  const tabs = [
    { id: 'incassi' as const, label: 'Incassi giornalieri', icon: Receipt },
    { id: 'chiusura' as const, label: 'Chiusura cassa', icon: CheckCircle2 },
    { id: 'report' as const, label: 'Report incassi', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cassa</h1>
          <p className="text-sm text-slate-500 mt-1">Gestione incassi, chiusure e report di cassa</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab content ── */}
      {tab === 'incassi' && (
        <TabIncassi
          data={dataIncassi}
          setData={setDataIncassi}
          incassi={incassi}
          loading={loadingIncassi}
          kpi={kpiIncassi}
          onShowModal={() => setShowModal(true)}
        />
      )}
      {tab === 'chiusura' && (
        <TabChiusura
          data={dataChiusura}
          setData={setDataChiusura}
          chiusure={chiusure}
          loading={loadingChiusure}
          giaFatta={chiusuraGiaFatta}
          incassi={incassi}
          nomeOperatore={nomeOperatore}
          onRefresh={fetchChiusure}
        />
      )}
      {tab === 'report' && (
        <TabReport
          da={reportDa}
          a={reportA}
          setDa={setReportDa}
          setA={setReportA}
          report={report}
          loading={loadingReport}
        />
      )}

      {/* ── Modal registra incasso ── */}
      {showModal && (
        <ModalRegistraIncasso
          nomeOperatore={nomeOperatore}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchIncassi() }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB 1: Incassi giornalieri
// ════════════════════════════════════════════════════════════════
function TabIncassi({
  data, setData, incassi, loading, kpi, onShowModal,
}: {
  data: string
  setData: (d: string) => void
  incassi: Incasso[]
  loading: boolean
  kpi: { totale: number; CONTANTI: number; CARTA: number; BONIFICO: number; GIFT_CARD: number; CAMERA: number }
  onShowModal: () => void
}) {
  const kpiCards = [
    { label: 'Totale giorno', value: kpi.totale, color: 'bg-white border-slate-200', textColor: 'text-slate-900' },
    { label: 'Contanti',      value: kpi.CONTANTI,  color: 'bg-green-50 border-green-200',  textColor: 'text-green-700' },
    { label: 'Carta',         value: kpi.CARTA,     color: 'bg-blue-50 border-blue-200',    textColor: 'text-blue-700' },
    { label: 'Bonifico',      value: kpi.BONIFICO,  color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-700' },
    { label: 'Gift Card',     value: kpi.GIFT_CARD, color: 'bg-amber-50 border-amber-200',  textColor: 'text-amber-700' },
    { label: 'Camera',        value: kpi.CAMERA,    color: 'bg-slate-50 border-slate-200',  textColor: 'text-slate-700' },
  ]

  return (
    <div className="space-y-6">
      {/* Date + action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <input
          type="date"
          value={data}
          onChange={e => setData(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={onShowModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Registra incasso
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(k => (
          <div key={k.label} className={cn('border rounded-xl p-4', k.color)}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={cn('text-lg font-bold mt-1', k.textColor)}>{formatValuta(k.value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : incassi.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <Banknote size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nessun incasso registrato</p>
          <p className="text-slate-400 text-sm mt-1">Clicca &quot;Registra incasso&quot; per aggiungere il primo</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Ora</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Importo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Metodo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo carta</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Operatore</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Descrizione</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Origine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incassi.map(inc => (
                  <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{inc.ora}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatValuta(inc.importo)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border', metodoBadge(inc.metodo))}>
                        {metodoLabel(inc.metodo)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {inc.tipoCarta ? (
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', tipoCartaBadge(inc.tipoCarta))}>
                          {tipoCartaLabel(inc.tipoCarta)}
                          {inc.ultime4Cifre && <span className="ml-1 opacity-70">****{inc.ultime4Cifre}</span>}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{inc.operatore}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{inc.descrizione}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-600">
                        {inc.origine}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB 2: Chiusura cassa
// ════════════════════════════════════════════════════════════════
function TabChiusura({
  data, setData, chiusure, loading, giaFatta, incassi, nomeOperatore, onRefresh,
}: {
  data: string
  setData: (d: string) => void
  chiusure: ChiusuraCassa[]
  loading: boolean
  giaFatta: boolean
  incassi: Incasso[]
  nomeOperatore: string
  onRefresh: () => void
}) {
  const [fondoInizio, setFondoInizio] = useState('')
  const [fondoFine, setFondoFine] = useState('')
  const [noteChiusura, setNoteChiusura] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auto-calculate totals from system
  const totaliSistema = useMemo(() => {
    const t: Record<MetodoPagamento, number> = { CONTANTI: 0, CARTA: 0, BONIFICO: 0, GIFT_CARD: 0, CAMERA: 0 }
    incassi.forEach(i => { t[i.metodo] = (t[i.metodo] ?? 0) + i.importo })
    return t
  }, [incassi])

  const fondoInizioNum = parseFloat(fondoInizio) || 0
  const fondoFineNum = parseFloat(fondoFine) || 0
  const differenza = fondoFineNum - (fondoInizioNum + totaliSistema.CONTANTI)

  const handleChiudi = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/host/cassa/chiusura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          fondoCassaInizio: fondoInizioNum,
          fondoCassaFine: fondoFineNum,
          totaleContanti: totaliSistema.CONTANTI,
          totaleCarta: totaliSistema.CARTA,
          totaleBonifico: totaliSistema.BONIFICO,
          totaleGiftCard: totaliSistema.GIFT_CARD,
          totaleCamera: totaliSistema.CAMERA,
          differenza,
          note: noteChiusura || undefined,
        }),
      })
      if (res.ok) {
        setFondoInizio('')
        setFondoFine('')
        setNoteChiusura('')
        onRefresh()
      }
    } catch (err) { console.error(err) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <input
        type="date"
        value={data}
        onChange={e => setData(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {/* Chiusura form */}
      {!giaFatta ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h3 className="text-lg font-semibold text-slate-900">Chiudi cassa del {format(new Date(data + 'T12:00:00'), 'd MMMM yyyy', { locale: it })}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fondo cassa inizio turno</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">EUR</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fondoInizio}
                  onChange={e => setFondoInizio(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg pl-12 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fondo cassa fine turno (contato)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">EUR</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fondoFine}
                  onChange={e => setFondoFine(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg pl-12 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Totali dal sistema */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Totali dal sistema</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              {METODI.map(m => (
                <div key={m.value} className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">{m.icon} {m.label}</span>
                  <span className="font-medium text-slate-900">{formatValuta(totaliSistema[m.value])}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Differenza */}
          <div className={cn(
            'rounded-lg p-4 border',
            differenza === 0
              ? 'bg-green-50 border-green-200'
              : differenza < 0
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {differenza === 0 ? (
                  <CheckCircle2 size={20} className="text-green-600" />
                ) : (
                  <AlertTriangle size={20} className={differenza < 0 ? 'text-red-600' : 'text-amber-600'} />
                )}
                <span className="text-sm font-medium">
                  {differenza === 0 ? 'Cassa quadra' : differenza < 0 ? 'Ammanco di cassa' : 'Eccedenza di cassa'}
                </span>
              </div>
              <span className={cn(
                'text-lg font-bold',
                differenza === 0 ? 'text-green-700' : differenza < 0 ? 'text-red-700' : 'text-amber-700'
              )}>
                {differenza >= 0 ? '+' : ''}{formatValuta(differenza)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Differenza = Fondo fine ({formatValuta(fondoFineNum)}) - (Fondo inizio ({formatValuta(fondoInizioNum)}) + Contanti ({formatValuta(totaliSistema.CONTANTI)}))
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note riconciliazione</label>
            <textarea
              value={noteChiusura}
              onChange={e => setNoteChiusura(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Annotazioni sulla chiusura..."
            />
          </div>

          <button
            onClick={handleChiudi}
            disabled={submitting || !fondoFine}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Chiudi cassa
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-3">
          <CheckCircle2 size={24} className="text-green-600 shrink-0" />
          <div>
            <p className="font-medium text-green-800">Cassa chiusa per il {format(new Date(data + 'T12:00:00'), 'd MMMM yyyy', { locale: it })}</p>
            <p className="text-sm text-green-600 mt-0.5">La chiusura cassa per questa data e&apos; gia&apos; stata effettuata.</p>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-3">Storico chiusure</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : chiusure.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nessuna chiusura registrata</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Turno</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Totale</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Differenza</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Operatore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chiusure.map(c => {
                    const tot = c.totaleContanti + c.totaleCarta + c.totaleBonifico + c.totaleGiftCard + c.totaleCamera
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-700">
                          {format(new Date(c.data + 'T12:00:00'), 'd MMM yyyy', { locale: it })}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{c.turno || '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatValuta(tot)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            c.differenza === 0
                              ? 'bg-green-100 text-green-700'
                              : c.differenza < 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          )}>
                            {c.differenza >= 0 ? '+' : ''}{formatValuta(c.differenza)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.operatore}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB 3: Report incassi
// ════════════════════════════════════════════════════════════════
function TabReport({
  da, a, setDa, setA, report, loading,
}: {
  da: string
  a: string
  setDa: (d: string) => void
  setA: (d: string) => void
  report: ReportData | null
  loading: boolean
}) {
  const handleExportCSV = () => {
    if (!report) return
    const rows = [['Data', 'Totale', 'Contanti', 'Carta']]
    report.trendGiornaliero.forEach(r => rows.push([r.data, String(r.totale), String(r.contanti), String(r.carta)]))
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-cassa-${da}-${da}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date range + export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={da}
            onChange={e => setDa(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-slate-400 text-sm">-</span>
          <input
            type="date"
            value={a}
            onChange={e => setA(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!report}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <Download size={16} />
          Esporta CSV
        </button>
      </div>

      {!report ? (
        <p className="text-sm text-slate-400 text-center py-16">Nessun dato disponibile per il periodo selezionato</p>
      ) : (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">Totale periodo</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatValuta(report.totale)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">Media giornaliera</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatValuta(report.mediaGiornaliera)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">Transazioni</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{report.numTransazioni}</p>
            </div>
          </div>

          {/* Breakdown per metodo */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Breakdown per metodo di pagamento</h3>

            {/* Stacked bar */}
            {report.totale > 0 && (
              <div className="h-6 rounded-full overflow-hidden flex mb-4">
                {METODI.map(m => {
                  const val = report.perMetodo[m.value] || 0
                  const pct = (val / report.totale) * 100
                  if (pct === 0) return null
                  const colors: Record<MetodoPagamento, string> = {
                    CONTANTI: 'bg-green-500', CARTA: 'bg-blue-500', BONIFICO: 'bg-purple-500',
                    GIFT_CARD: 'bg-amber-500', CAMERA: 'bg-slate-500',
                  }
                  return (
                    <div
                      key={m.value}
                      className={cn(colors[m.value], 'transition-all')}
                      style={{ width: `${pct}%` }}
                      title={`${m.label}: ${formatValuta(val)} (${pct.toFixed(1)}%)`}
                    />
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {METODI.map(m => {
                const val = report.perMetodo[m.value] || 0
                const pct = report.totale > 0 ? ((val / report.totale) * 100).toFixed(1) : '0.0'
                return (
                  <div key={m.value} className={cn('border rounded-lg p-3', m.bgColor)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{m.icon}</span>
                      <span className={cn('text-sm font-medium', m.color)}>{m.label}</span>
                    </div>
                    <p className={cn('text-lg font-bold', m.color)}>{formatValuta(val)}</p>
                    <p className="text-xs text-slate-500">{pct}%</p>
                    {m.value === 'CARTA' && report.perTipoCarta && Object.keys(report.perTipoCarta).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-blue-200 space-y-1">
                        {Object.entries(report.perTipoCarta).map(([tipo, val]) => (
                          <div key={tipo} className="flex justify-between text-xs">
                            <span className="text-blue-600">{tipo}</span>
                            <span className="font-medium text-blue-700">{formatValuta(val as number)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Breakdown per origine */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Breakdown per origine</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(report.perOrigine).map(([origine, val]) => (
                <div key={origine} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-sm text-slate-600">{origine}</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{formatValuta(val as number)}</p>
                  {report.totale > 0 && (
                    <p className="text-xs text-slate-400">{(((val as number) / report.totale) * 100).toFixed(1)}%</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Per operatore */}
          {report.perOperatore.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Per operatore</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Operatore</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">N. incassi</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Totale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.perOperatore.map(op => (
                      <tr key={op.operatore} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-700 font-medium">{op.operatore}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{op.numIncassi}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatValuta(op.totale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trend giornaliero */}
          {report.trendGiornaliero.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Trend giornaliero</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.trendGiornaliero}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => {
                        try { return format(new Date(v + 'T12:00:00'), 'd/M', { locale: it }) } catch { return v }
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}`} />
                    <Tooltip
                      formatter={(value: number) => formatValuta(value)}
                      labelFormatter={(v) => {
                        try { return format(new Date(v + 'T12:00:00'), 'd MMMM yyyy', { locale: it }) } catch { return v }
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="totale" stroke="#1e40af" strokeWidth={2} name="Totale" dot={false} />
                    <Line type="monotone" dataKey="contanti" stroke="#16a34a" strokeWidth={1.5} name="Contanti" dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="carta" stroke="#2563eb" strokeWidth={1.5} name="Carta" dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Differenze cassa */}
          {report.chiusureConDifferenza.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-red-600" />
                <h3 className="text-base font-semibold text-red-800">Differenze di cassa nel periodo</h3>
              </div>
              <div className="space-y-2">
                {report.chiusureConDifferenza.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-red-100">
                    <div>
                      <span className="text-sm font-medium text-slate-900">
                        {format(new Date(c.data + 'T12:00:00'), 'd MMMM yyyy', { locale: it })}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">({c.operatore})</span>
                    </div>
                    <span className={cn(
                      'text-sm font-bold',
                      c.differenza < 0 ? 'text-red-700' : 'text-amber-700'
                    )}>
                      {c.differenza >= 0 ? '+' : ''}{formatValuta(c.differenza)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Modal: Registra incasso
// ════════════════════════════════════════════════════════════════
function ModalRegistraIncasso({
  nomeOperatore, onClose, onCreated,
}: {
  nomeOperatore: string
  onClose: () => void
  onCreated: () => void
}) {
  const [importo, setImporto] = useState('')
  const [metodo, setMetodo] = useState<MetodoPagamento>('CONTANTI')
  const [tipoCarta, setTipoCarta] = useState<TipoCarta>('VISA')
  const [ultime4, setUltime4] = useState('')
  const [isMisto, setIsMisto] = useState(false)
  const [splitAmounts, setSplitAmounts] = useState<Record<MetodoPagamento, string>>({
    CONTANTI: '', CARTA: '', BONIFICO: '', GIFT_CARD: '', CAMERA: '',
  })
  const [origine, setOrigine] = useState('Prenotazione')
  const [descrizione, setDescrizione] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (isMisto) {
        // Create multiple incassi for split payment
        const entries = Object.entries(splitAmounts).filter(([, v]) => parseFloat(v) > 0)
        for (const [met, val] of entries) {
          await fetch('/api/host/cassa/incassi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              importo: parseFloat(val),
              metodo: met,
              tipoCarta: met === 'CARTA' ? tipoCarta : undefined,
              ultime4Cifre: met === 'CARTA' ? ultime4 : undefined,
              origine,
              descrizione,
              note: note || undefined,
            }),
          })
        }
      } else {
        await fetch('/api/host/cassa/incassi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importo: parseFloat(importo),
            metodo,
            tipoCarta: metodo === 'CARTA' ? tipoCarta : undefined,
            ultime4Cifre: metodo === 'CARTA' ? ultime4 : undefined,
            origine,
            descrizione,
            note: note || undefined,
          }),
        })
      }
      onCreated()
    } catch (err) { console.error(err) } finally { setSubmitting(false) }
  }

  const splitTotal = Object.values(splitAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const isValid = isMisto
    ? splitTotal > 0 && descrizione.trim().length > 0
    : parseFloat(importo) > 0 && descrizione.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Registra incasso</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Misto toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isMisto}
              onChange={e => setIsMisto(e.target.checked)}
              className="rounded border-slate-300"
            />
            Pagamento misto (split)
          </label>

          {!isMisto ? (
            <>
              {/* Importo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Importo *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">EUR</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={importo}
                    onChange={e => setImporto(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg pl-12 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Metodo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Metodo di pagamento *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {METODI.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMetodo(m.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                        metodo === m.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Split amounts */
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Importi per metodo</label>
              {METODI.map(m => (
                <div key={m.value} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-slate-600 flex items-center gap-1.5">
                    <span>{m.icon}</span> {m.label}
                  </span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">EUR</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={splitAmounts[m.value]}
                      onChange={e => setSplitAmounts(prev => ({ ...prev, [m.value]: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500 text-right">Totale split: <span className="font-medium">{formatValuta(splitTotal)}</span></p>
            </div>
          )}

          {/* Tipo carta (conditional) */}
          {(metodo === 'CARTA' || (isMisto && parseFloat(splitAmounts.CARTA) > 0)) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo carta</label>
                <select
                  value={tipoCarta}
                  onChange={e => setTipoCarta(e.target.value as TipoCarta)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {TIPI_CARTA.map(tc => (
                    <option key={tc.value} value={tc.value}>{tc.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ultime 4 cifre</label>
                <input
                  type="text"
                  maxLength={4}
                  value={ultime4}
                  onChange={e => setUltime4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1234"
                />
              </div>
            </div>
          )}

          {/* Origine */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Origine</label>
            <select
              value={origine}
              onChange={e => setOrigine(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ORIGINI.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione *</label>
            <input
              type="text"
              value={descrizione}
              onChange={e => setDescrizione(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Es. Soggiorno camera 101"
            />
          </div>

          {/* Operatore (read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Operatore</label>
            <input
              type="text"
              value={nomeOperatore}
              readOnly
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Note aggiuntive..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Registra
          </button>
        </div>
      </div>
    </div>
  )
}
