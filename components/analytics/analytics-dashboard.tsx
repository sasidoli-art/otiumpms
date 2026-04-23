'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, Line,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, Euro, BedDouble, BarChart3,
  Target, Clock, Loader2, Download, ChevronDown,
} from 'lucide-react'
import { format, subMonths, startOfMonth, startOfYear } from 'date-fns'

// ────────────────────────────────────────────────────────────────────────────
// Types — allineate al contratto di /api/host/analytics
// ────────────────────────────────────────────────────────────────────────────

type Delta = {
  revenue: number; occupazione: number; adr: number; revpar: number
  durataMedia: number; prenotazioni: number
}

type AnalyticsData = {
  periodo: { da: string; a: string; giorni: number; granularita: 'giorno' | 'settimana' | 'mese'; confronto: boolean }
  strutturaId: string | null
  unitaTotali: number
  kpi: {
    revenue: number; occupazione: number; adr: number; revpar: number
    durataMedia: number; prenotazioni: number
    delta: Delta
    precedente: Delta
  }
  mediaOccupazione: number
  serieRevenue: Array<{ data: string; label: string; valore: number; valorePrecedente?: number }>
  serieOccupazione: Array<{ data: string; label: string; percentuale: number }>
  perCanale: Array<{ canale: string; prenotazioni: number; revenue: number; percentuale: number }>
  topCamere: Array<{ unitaNome: string; notti: number; revenue: number }>
  dettaglioMensile: Array<{
    mese: string; label: string; prenotazioni: number; notti: number
    revenue: number; occupazione: number; adr: number; revpar: number
  }>
}

type StrutturaOption = { id: string; nome: string }

type Periodo = 'mese-corrente' | 'mese-scorso' | '3-mesi' | '12-mesi' | 'anno-corrente' | 'custom'

// ────────────────────────────────────────────────────────────────────────────
// Helpers formattazione
// ────────────────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const fmtEuroFull = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
const fmtPct = (n: number) => `${n.toFixed(1)}%`
const fmtNum = (n: number) => new Intl.NumberFormat('it-IT').format(n)

const CANALE_COLORS: Record<string, string> = {
  Diretto: '#6366f1',
  'Booking.com': '#003580',
  Airbnb: '#ff5a5f',
  VRBO: '#0ea5e9',
  Expedia: '#ffc72c',
  Altro: '#94a3b8',
}

function getCanaleColor(c: string): string {
  return CANALE_COLORS[c] ?? '#94a3b8'
}

function coloreOccupazione(pct: number): string {
  if (pct < 70) return '#10b981' // verde
  if (pct <= 90) return '#f59e0b' // giallo
  return '#ef4444' // rosso
}

function DeltaBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const zero = Math.abs(value) < 0.1
  if (zero) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 font-medium">
        <Minus className="w-3 h-3" /> 0{suffix}
      </span>
    )
  }
  const positivo = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
      positivo ? 'text-green-600' : 'text-red-500'
    }`}>
      {positivo ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positivo ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Calcolo range periodo preset
// ────────────────────────────────────────────────────────────────────────────

function rangePerPreset(preset: Periodo): { da: string; a: string } | null {
  const oggi = new Date()
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  if (preset === 'mese-corrente') {
    return { da: fmt(startOfMonth(oggi)), a: fmt(oggi) }
  }
  if (preset === 'mese-scorso') {
    const inizio = startOfMonth(subMonths(oggi, 1))
    const fine = new Date(inizio.getFullYear(), inizio.getMonth() + 1, 0)
    return { da: fmt(inizio), a: fmt(fine) }
  }
  if (preset === '3-mesi') {
    return { da: fmt(startOfMonth(subMonths(oggi, 2))), a: fmt(oggi) }
  }
  if (preset === '12-mesi') {
    return { da: fmt(startOfMonth(subMonths(oggi, 11))), a: fmt(oggi) }
  }
  if (preset === 'anno-corrente') {
    return { da: fmt(startOfYear(oggi)), a: fmt(oggi) }
  }
  return null // custom
}

// ────────────────────────────────────────────────────────────────────────────
// Sotto-componenti
// ────────────────────────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string
  value: string
  delta?: number
  deltaSuffix?: string
  icon: React.ComponentType<{ className?: string }>
  sparkline?: number[]
  tone?: 'indigo' | 'emerald' | 'amber' | 'violet' | 'sky'
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const w = 80, h = 24
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

const TONE_CLASSES: Record<NonNullable<KpiCardProps['tone']>, { bg: string; icon: string; spark: string }> = {
  indigo:  { bg: 'from-indigo-50 to-white',   icon: 'bg-indigo-500 text-white',   spark: '#6366f1' },
  emerald: { bg: 'from-emerald-50 to-white',  icon: 'bg-emerald-500 text-white',  spark: '#10b981' },
  amber:   { bg: 'from-amber-50 to-white',    icon: 'bg-amber-500 text-white',    spark: '#f59e0b' },
  violet:  { bg: 'from-violet-50 to-white',   icon: 'bg-violet-500 text-white',   spark: '#8b5cf6' },
  sky:     { bg: 'from-sky-50 to-white',      icon: 'bg-sky-500 text-white',      spark: '#0ea5e9' },
}

function KpiCard({ label, value, delta, deltaSuffix = '%', icon: Icon, sparkline, tone = 'indigo' }: KpiCardProps) {
  const t = TONE_CLASSES[tone]
  return (
    <div className={`rounded-xl bg-gradient-to-br ${t.bg} border border-gray-200/70 p-4 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${t.icon} flex items-center justify-center shadow-sm`}>
          <Icon className="w-4 h-4" />
        </div>
        {typeof delta === 'number' && <DeltaBadge value={delta} suffix={deltaSuffix} />}
      </div>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
        {sparkline && <Sparkline data={sparkline} color={t.spark} />}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Componente principale
// ────────────────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [periodo, setPeriodo] = useState<Periodo>('mese-corrente')
  const [daCustom, setDaCustom] = useState('')
  const [aCustom, setACustom] = useState('')
  const [strutturaId, setStrutturaId] = useState<string>('')
  const [confronto, setConfronto] = useState(true)

  const [strutture, setStrutture] = useState<StrutturaOption[]>([])
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  // Range effettivo in base al preset
  const range = useMemo(() => {
    if (periodo === 'custom') {
      if (daCustom && aCustom) return { da: daCustom, a: aCustom }
      return null
    }
    return rangePerPreset(periodo)
  }, [periodo, daCustom, aCustom])

  const carica = useCallback(async () => {
    if (!range) return
    setLoading(true)
    setErrore(null)
    try {
      const params = new URLSearchParams({
        da: range.da,
        a: range.a,
        confronto: String(confronto),
      })
      if (strutturaId) params.set('strutturaId', strutturaId)
      const res = await fetch(`/api/host/analytics?${params}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Errore nel caricamento analytics')
      }
      setData(await res.json())
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [range, confronto, strutturaId])

  // Carica strutture per selector
  useEffect(() => {
    fetch('/api/host/strutture')
      .then((r) => r.ok ? r.json() : [])
      .then((arr: unknown) => {
        if (Array.isArray(arr)) {
          setStrutture(arr.map((s) => {
            const o = s as { id?: string; nome?: string }
            return { id: o.id ?? '', nome: o.nome ?? '' }
          }).filter((s) => s.id))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => { carica() }, [carica])

  const sparkRevenue = useMemo(
    () => data?.serieRevenue.map((r) => r.valore) ?? [],
    [data],
  )
  const sparkOccupazione = useMemo(
    () => data?.serieOccupazione.map((r) => r.percentuale) ?? [],
    [data],
  )

  const esportaCSV = () => {
    if (!data) return
    const righe: string[] = []
    righe.push('Mese,Prenotazioni,Notti,Revenue,Occupazione%,ADR,RevPAR')
    data.dettaglioMensile.forEach((r) => {
      righe.push([
        r.label.replace(/,/g, ''),
        r.prenotazioni, r.notti,
        r.revenue.toFixed(2),
        r.occupazione.toFixed(1),
        r.adr.toFixed(2),
        r.revpar.toFixed(2),
      ].join(','))
    })
    const tot = data.dettaglioMensile.reduce((acc, r) => ({
      prenotazioni: acc.prenotazioni + r.prenotazioni,
      notti: acc.notti + r.notti,
      revenue: acc.revenue + r.revenue,
    }), { prenotazioni: 0, notti: 0, revenue: 0 })
    righe.push(['TOTALE', tot.prenotazioni, tot.notti, tot.revenue.toFixed(2), '', '', ''].join(','))

    const blob = new Blob([righe.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${data.periodo.da}_${data.periodo.a}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* ─── Header + Selettori ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="text-sm text-gray-500">
            Performance del business: trend, confronti, revenue per canale e camera.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
          {/* Periodo */}
          <div className="relative">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className="appearance-none pl-3 pr-8 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="mese-corrente">Questo mese</option>
              <option value="mese-scorso">Ultimo mese</option>
              <option value="3-mesi">Ultimi 3 mesi</option>
              <option value="12-mesi">Ultimi 12 mesi</option>
              <option value="anno-corrente">Anno corrente</option>
              <option value="custom">Range personalizzato</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {periodo === 'custom' && (
            <>
              <input
                type="date"
                value={daCustom}
                onChange={(e) => setDaCustom(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                value={aCustom}
                onChange={(e) => setACustom(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </>
          )}

          {/* Struttura */}
          {strutture.length > 1 && (
            <div className="relative">
              <select
                value={strutturaId}
                onChange={(e) => setStrutturaId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="">Tutte le strutture</option>
                {strutture.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Confronto toggle */}
          <label className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={confronto}
              onChange={(e) => setConfronto(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 cursor-pointer"
            />
            vs periodo precedente
          </label>

          <div className="ml-auto" />

          <button
            onClick={esportaCSV}
            disabled={!data}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Caricamento analytics...
        </div>
      )}

      {errore && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {errore}
        </div>
      )}

      {data && (
        <>
          {/* ─── KPI BAR ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Revenue totale"
              value={fmtEuro(data.kpi.revenue)}
              delta={data.periodo.confronto ? data.kpi.delta.revenue : undefined}
              icon={Euro}
              sparkline={sparkRevenue}
              tone="indigo"
            />
            <KpiCard
              label="Occupazione media"
              value={fmtPct(data.kpi.occupazione)}
              delta={data.periodo.confronto ? data.kpi.delta.occupazione : undefined}
              icon={BedDouble}
              sparkline={sparkOccupazione}
              tone="emerald"
            />
            <KpiCard
              label="ADR"
              value={fmtEuro(data.kpi.adr)}
              delta={data.periodo.confronto ? data.kpi.delta.adr : undefined}
              icon={Target}
              tone="amber"
            />
            <KpiCard
              label="RevPAR"
              value={fmtEuro(data.kpi.revpar)}
              delta={data.periodo.confronto ? data.kpi.delta.revpar : undefined}
              icon={BarChart3}
              tone="violet"
            />
            <KpiCard
              label="Durata media"
              value={`${data.kpi.durataMedia.toFixed(1)} nt`}
              delta={data.periodo.confronto ? data.kpi.delta.durataMedia : undefined}
              icon={Clock}
              tone="sky"
            />
          </div>

          {/* ─── Riga 1: Revenue + Occupazione ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue area chart */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Revenue</h3>
                <span className="text-xs text-gray-500">
                  {fmtEuroFull(data.kpi.revenue)}
                  {data.periodo.confronto && (
                    <> · prec. {fmtEuroFull(data.kpi.precedente.revenue)}</>
                  )}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.serieRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => fmtEuro(v)} width={60} />
                  <Tooltip
                    formatter={(v: number) => fmtEuroFull(v)}
                    labelClassName="text-xs"
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                  />
                  {data.periodo.confronto && (
                    <Line
                      type="monotone"
                      dataKey="valorePrecedente"
                      stroke="#cbd5e1"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Periodo precedente"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="valore"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#rev-grad)"
                    name="Periodo attuale"
                  />
                  {data.periodo.confronto && <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Occupazione bar chart */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Occupazione</h3>
                <span className="text-xs text-gray-500">
                  Media {fmtPct(data.mediaOccupazione)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.serieOccupazione} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                    width={40}
                  />
                  <Tooltip
                    formatter={(v: number) => `${v.toFixed(1)}%`}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                  />
                  <ReferenceLine
                    y={data.mediaOccupazione}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    label={{ value: 'Media', fontSize: 10, fill: '#64748b', position: 'right' }}
                  />
                  <Bar dataKey="percentuale" radius={[4, 4, 0, 0]}>
                    {data.serieOccupazione.map((r, i) => (
                      <Cell key={i} fill={coloreOccupazione(r.percentuale)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─── Riga 2: Canali + Top Camere ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie canali */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Prenotazioni per canale</h3>
              {data.perCanale.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                  Nessuna prenotazione nel periodo
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.perCanale}
                        dataKey="prenotazioni"
                        nameKey="canale"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {data.perCanale.map((c) => (
                          <Cell key={c.canale} fill={getCanaleColor(c.canale)} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, _n, p) => {
                          const payload = (p as { payload?: { percentuale?: number } })?.payload
                          const pct = payload?.percentuale ?? 0
                          return [`${v} (${pct.toFixed(1)}%)`, 'prenotazioni']
                        }}
                        contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5">
                    {data.perCanale.map((c) => (
                      <div key={c.canale} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ background: getCanaleColor(c.canale) }}
                          />
                          <span className="text-gray-700 truncate">{c.canale}</span>
                        </div>
                        <div className="text-gray-500 tabular-nums">
                          {c.prenotazioni} <span className="text-gray-400">·</span> {c.percentuale.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top camere bar orizzontale */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Top camere</h3>
              {data.topCamere.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                  Nessun dato disponibile
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, data.topCamere.length * 28)}>
                  <BarChart
                    data={data.topCamere}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="unitaNome"
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                      width={120}
                    />
                    <Tooltip
                      formatter={(v: number, name: string) => {
                        if (name === 'revenue') return [fmtEuroFull(v), 'Revenue']
                        return [v, 'Notti']
                      }}
                      contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="notti" fill="#6366f1" radius={[0, 4, 4, 0]} name="Notti" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ─── Tabella dettaglio mensile ───────────────────────────────── */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Dettaglio mensile</h3>
              <span className="text-xs text-gray-500">{data.dettaglioMensile.length} mesi</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Mese</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Prenotazioni</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Notti</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Revenue</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Occupazione</th>
                    <th className="text-right px-4 py-2.5 font-semibold">ADR</th>
                    <th className="text-right px-4 py-2.5 font-semibold">RevPAR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dettaglioMensile.map((r) => (
                    <tr key={r.mese} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{r.label}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtNum(r.prenotazioni)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtNum(r.notti)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-semibold text-gray-900">{fmtEuro(r.revenue)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtPct(r.occupazione)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(r.adr)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(r.revpar)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold text-gray-900">
                  <tr className="border-t border-gray-200">
                    <td className="px-4 py-2.5">Totale</td>
                    <td className="text-right px-4 py-2.5 tabular-nums">
                      {fmtNum(data.dettaglioMensile.reduce((s, r) => s + r.prenotazioni, 0))}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">
                      {fmtNum(data.dettaglioMensile.reduce((s, r) => s + r.notti, 0))}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">
                      {fmtEuro(data.dettaglioMensile.reduce((s, r) => s + r.revenue, 0))}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">
                      {fmtPct(data.kpi.occupazione)}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{fmtEuro(data.kpi.adr)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{fmtEuro(data.kpi.revpar)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
