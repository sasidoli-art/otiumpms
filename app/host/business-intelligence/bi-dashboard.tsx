'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, Loader2, Calendar, DollarSign, BarChart3, PieChart as PieIcon,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react'



type BIData = {
  forecast: { forecast30: number; forecast60: number; forecast90: number }
  occupancyForecast: { data: string; occupancy: number }[]
  revparTrend: { mese: string; revpar: number; adr: number }[]
  currentRevPAR: number
  cancellationRate: number
  revenueBySource: { fonte: string; revenue: number }[]
  topRoomTypes: { nome: string; revenue: number; bookings: number }[]
  avgLOS: number
  yoyComparison: { mese: string; annoCorrente: number; annoPrecedente: number }[]
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const fmtFull = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

export default function BIDashboard() {
  const [data, setData] = useState<BIData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/host/business-intelligence')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Impossibile caricare i dati</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Intelligence</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Analisi previsionale e trend della tua struttura</p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Forecast 30gg', value: fmt(data.forecast.forecast30), icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
          { label: 'Forecast 60gg', value: fmt(data.forecast.forecast60), icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Forecast 90gg', value: fmt(data.forecast.forecast90), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'RevPAR (mese)', value: fmtFull(data.currentRevPAR), icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg ${k.bg} flex items-center justify-center`}>
                <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{k.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Extra KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">Tasso cancellazione</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{data.cancellationRate}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">Durata media soggiorno</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{data.avgLOS} notti</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">Fonti di revenue</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{data.revenueBySource.length}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Forecast (RevPAR + ADR Trend) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">RevPAR &amp; ADR (ultimi 12 mesi)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.revparTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => [fmtFull(value), name === 'revpar' ? 'RevPAR' : 'ADR']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Line type="monotone" dataKey="revpar" name="RevPAR" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="adr" name="ADR" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Forecast */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Previsione occupazione (prossimi 30gg)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.occupancyForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => new Date(v).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'Occupazione']}
                labelFormatter={(label: string) => new Date(label).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Area type="monotone" dataKey="occupancy" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Source Pie */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Revenue per fonte</h3>
          {data.revenueBySource.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">Nessun dato</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.revenueBySource}
                  dataKey="revenue"
                  nameKey="fonte"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ fonte, percent }: { fonte: string; percent: number }) => `${fonte} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.revenueBySource.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [fmt(value), 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* YoY Comparison */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Confronto anno su anno</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.yoyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => [fmt(value), name === 'annoCorrente' ? 'Anno corrente' : 'Anno precedente']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend formatter={(v: string) => v === 'annoCorrente' ? 'Anno corrente' : 'Anno precedente'} />
              <Bar dataKey="annoPrecedente" fill="#d1d5db" radius={[4, 4, 0, 0]} />
              <Bar dataKey="annoCorrente" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Room Types */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Top 5 camere per revenue</h3>
          {data.topRoomTypes.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Nessun dato disponibile</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 uppercase text-left">
                  <th className="py-2">Camera</th>
                  <th className="py-2 text-right">Prenotazioni</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topRoomTypes.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                    <td className="py-2.5 font-medium text-gray-900 dark:text-white">{r.nome}</td>
                    <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{r.bookings}</td>
                    <td className="py-2.5 text-right font-medium text-gray-900 dark:text-white">{fmt(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Monthly YoY Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Dettaglio mensile YoY</h3>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-800">
                <tr className="border-b border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 uppercase text-left">
                  <th className="py-2">Mese</th>
                  <th className="py-2 text-right">Anno corrente</th>
                  <th className="py-2 text-right">Anno prec.</th>
                  <th className="py-2 text-right">Var. %</th>
                </tr>
              </thead>
              <tbody>
                {data.yoyComparison.map((r, i) => {
                  const variation = r.annoPrecedente > 0
                    ? Math.round(((r.annoCorrente - r.annoPrecedente) / r.annoPrecedente) * 100)
                    : r.annoCorrente > 0 ? 100 : 0
                  const isPositive = variation >= 0
                  return (
                    <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                      <td className="py-2.5 font-medium text-gray-700 dark:text-gray-300 capitalize">{r.mese}</td>
                      <td className="py-2.5 text-right text-gray-900 dark:text-white">{fmt(r.annoCorrente)}</td>
                      <td className="py-2.5 text-right text-gray-500 dark:text-gray-400">{fmt(r.annoPrecedente)}</td>
                      <td className="py-2.5 text-right">
                        {r.annoCorrente === 0 && r.annoPrecedente === 0 ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(variation)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
