'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface AnalyticsData {
  generatedAt: string
  range: number
  kpi: {
    liveSessions: number
    loginToday: number
    loginYesterday: number
    loginRange: number
    uniqueDevicesRange: number
    durataMediaMin: number
    deltaPct: number
  }
  loginsByDay: { date: string; total: number; codice: number; prenotazione: number; complimentary: number; userForm: number; emailOnly: number }[]
  authMix: { tipo: string; count: number }[]
  topCodes: { codice: string; durataMinuti: number; usiMax: number; usiEffettuati: number; validoFino: string | null }[]
  recentSessions: { id: string; tipo: string; guest: string; mac: string | null; ip: string | null; startAt: string; expiresAt: string; active: boolean }[]
  deviceStatus: { online: number; offline: number; pending: number; disabled: number }
  heatmap: { dow: number; hour: number; count: number }[]
  topUserAgents: { os: string; count: number }[]
}

const RANGES = [7, 30, 90] as const
type Range = typeof RANGES[number]

const OS_EMOJI: Record<string, string> = {
  iOS: '🍎', Android: '🤖', Windows: '🪟', macOS: '💻', Linux: '🐧', ChromeOS: '🌐', Altro: '❓',
}

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

const TIPO_LABEL: Record<string, string> = {
  CODICE: 'Codice',
  PRENOTAZIONE: 'Prenotazione',
  COMPLIMENTARY: 'Gratuito',
  USER_FORM: 'Form registrazione',
  EMAIL_ONLY: 'Email prenotazione',
  PIN: 'PIN',
}

const TIPO_COLOR: Record<string, string> = {
  CODICE: '#4f46e5',
  PRENOTAZIONE: '#10b981',
  COMPLIMENTARY: '#f59e0b',
  USER_FORM: '#06b6d4',
  EMAIL_ONLY: '#8b5cf6',
  PIN: '#ec4899',
}

export default function AnalyticsClient({ hostNome }: { hostNome: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [range, setRange] = useState<Range>(30)
  const [exporting, setExporting] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/host/wifi/analytics?range=${range}`, { cache: 'no-store' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'errore' }))
        setErr(d.error || `HTTP ${res.status}`)
        return
      }
      const json = await res.json()
      setData(json)
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'errore di rete')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)  // refresh ogni 30s
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  async function downloadCsv() {
    setExporting(true)
    try {
      const res = await fetch(`/api/host/wifi/sessions/export?range=${Math.max(range, 180)}`, { cache: 'no-store' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'errore' }))
        alert(`Errore export: ${d.error ?? res.status}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition') || ''
      const fnMatch = cd.match(/filename="([^"]+)"/)
      a.download = fnMatch ? fnMatch[1] : 'wifi_sessions.csv'
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Caricamento…</div>
  }
  if (err || !data) {
    return <div className="p-8 text-center text-red-600">Errore: {err ?? 'dati non disponibili'}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Analytics Wi-Fi</h1>
            <p className="text-sm text-gray-500">{hostNome} · aggiornato ogni 30 sec</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Range picker */}
            <div className="inline-flex bg-gray-100 rounded-lg p-1">
              {RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                    range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {r} giorni
                </button>
              ))}
            </div>
            {/* Export CSV */}
            <button
              onClick={downloadCsv}
              disabled={exporting}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              title="Export CSV ultimi 180 giorni (Pisanu)"
            >
              {exporting ? 'Genero…' : '⬇ Export CSV'}
            </button>
            <div className="text-xs text-gray-500">
              ⟳ {new Date(data.generatedAt).toLocaleTimeString('it-IT')}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="Sessioni live" value={data.kpi.liveSessions} hint={`${data.deviceStatus.online} router online`} highlight />
          <KpiCard label="Login oggi" value={data.kpi.loginToday} delta={data.kpi.deltaPct} />
          <KpiCard label={`Login ${data.range}gg`} value={data.kpi.loginRange} hint={`media ${Math.round(data.kpi.loginRange / data.range)}/giorno`} />
          <KpiCard label={`Device unici ${data.range}gg`} value={data.kpi.uniqueDevicesRange} hint="MAC unici" />
          <KpiCard label="Durata media" value={data.kpi.durataMediaMin} hint="minuti per sessione" suffix=" min" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Login per giorno (ultimi {data.range} giorni)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.loginsByDay} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} interval={3} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} dot={false} name="Totale" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Metodo auth ({data.range}gg)</h3>
            {data.authMix.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
                Nessun login negli ultimi 30 giorni
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.authMix}
                    dataKey="count"
                    nameKey="tipo"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {data.authMix.map((m, i) => (
                      <Cell key={i} fill={TIPO_COLOR[m.tipo] ?? '#cbd5e1'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, _, p) => [`${v} login`, TIPO_LABEL[(p.payload as { tipo: string }).tipo] ?? p.payload.tipo]} />
                  <Legend formatter={t => TIPO_LABEL[t as string] ?? t} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Heatmap + Top UA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Quando si connettono (giorno × ora)</h3>
            <Heatmap data={data.heatmap} />
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Sistema operativo device</h3>
            {data.topUserAgents.length === 0 ? (
              <p className="text-sm text-gray-400">Nessun User-Agent rilevato.</p>
            ) : (
              <div className="space-y-2">
                {data.topUserAgents.map(ua => {
                  const total = data.topUserAgents.reduce((s, x) => s + x.count, 0)
                  const pct = total > 0 ? Math.round((ua.count / total) * 100) : 0
                  return (
                    <div key={ua.os}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{OS_EMOJI[ua.os] ?? '❓'} {ua.os}</span>
                        <span className="text-gray-500">{ua.count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded">
                        <div className="h-2 bg-indigo-500 rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top codes + recent sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Top codici per utilizzo</h3>
            {data.topCodes.length === 0 ? (
              <p className="text-sm text-gray-400">Nessun codice ancora.</p>
            ) : (
              <div className="space-y-2">
                {data.topCodes.map(c => (
                  <div key={c.codice} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <div className="font-mono text-sm font-semibold">{c.codice}</div>
                      <div className="text-xs text-gray-500">{c.durataMinuti / 60}h sessione</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{c.usiEffettuati}</div>
                      <div className="text-xs text-gray-500">
                        {c.usiMax === -1 ? 'illimitati' : `/${c.usiMax}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Ultime 20 sessioni</h3>
            {data.recentSessions.length === 0 ? (
              <p className="text-sm text-gray-400">Nessuna sessione registrata.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-gray-500 border-b">
                    <tr>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">Ospite</th>
                      <th className="py-2 pr-3 hidden md:table-cell">MAC</th>
                      <th className="py-2 pr-3">Inizio</th>
                      <th className="py-2 pr-3">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSessions.map(s => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white" style={{ background: TIPO_COLOR[s.tipo] ?? '#94a3b8' }}>
                            {TIPO_LABEL[s.tipo] ?? s.tipo}
                          </span>
                        </td>
                        <td className="py-2 pr-3 truncate max-w-[180px]">{s.guest}</td>
                        <td className="py-2 pr-3 font-mono text-xs hidden md:table-cell">{s.mac || '—'}</td>
                        <td className="py-2 pr-3 text-xs">{formatRel(s.startAt)}</td>
                        <td className="py-2 pr-3">
                          {s.active
                            ? <span className="text-green-600 text-xs font-medium">● live</span>
                            : <span className="text-gray-400 text-xs">scaduta</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, hint, delta, highlight, suffix }: { label: string; value: number; hint?: string; delta?: number; highlight?: boolean; suffix?: string }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white'}`}>
      <div className={`text-xs uppercase tracking-wide ${highlight ? 'text-indigo-200' : 'text-gray-500'}`}>{label}</div>
      <div className="text-3xl font-bold mt-1 flex items-baseline gap-2">
        <span>{value.toLocaleString('it-IT')}{suffix ?? ''}</span>
        {typeof delta === 'number' && (
          <span className={`text-xs font-semibold ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '−'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {hint && <div className={`text-xs mt-1 ${highlight ? 'text-indigo-200' : 'text-gray-500'}`}>{hint}</div>}
    </div>
  )
}

function Heatmap({ data }: { data: { dow: number; hour: number; count: number }[] }) {
  const maxCount = Math.max(1, ...data.map(d => d.count))
  // Riordina: settimana inizia da Lunedì → indici DOW 1,2,3,4,5,6,0
  const orderedDows = [1, 2, 3, 4, 5, 6, 0]

  function getCell(dow: number, hour: number): number {
    return data.find(d => d.dow === dow && d.hour === hour)?.count ?? 0
  }
  function intensity(c: number): string {
    if (c === 0) return '#f3f4f6'
    const t = Math.min(1, c / maxCount)
    const lightness = 95 - t * 50  // da 95 (chiaro) a 45 (intenso)
    return `hsl(238, 75%, ${lightness}%)`
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header ore */}
        <div className="grid gap-px mb-1" style={{ gridTemplateColumns: '40px repeat(24, 1fr)' }}>
          <div />
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="text-[9px] text-center text-gray-400 leading-3">{h % 3 === 0 ? h : ''}</div>
          ))}
        </div>
        {/* Righe DOW */}
        {orderedDows.map(dow => (
          <div key={dow} className="grid gap-px mb-px" style={{ gridTemplateColumns: '40px repeat(24, 1fr)' }}>
            <div className="text-[11px] text-gray-500 leading-5 pr-1 text-right">{DOW_LABELS[dow]}</div>
            {Array.from({ length: 24 }).map((_, hour) => {
              const c = getCell(dow, hour)
              return (
                <div
                  key={hour}
                  className="h-5 rounded-sm"
                  style={{ background: intensity(c) }}
                  title={`${DOW_LABELS[dow]} ${hour}:00 — ${c} login`}
                />
              )
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
          <span>0</span>
          <div className="flex gap-px">
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <div key={t} className="w-4 h-3 rounded-sm" style={{ background: t === 0 ? '#f3f4f6' : `hsl(238, 75%, ${95 - t * 50}%)` }} />
            ))}
          </div>
          <span>max {maxCount}</span>
        </div>
      </div>
    </div>
  )
}

function formatRel(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 2) return 'adesso'
  if (min < 60) return `${min}m fa`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h fa`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}g fa`
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}
