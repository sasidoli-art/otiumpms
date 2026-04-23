'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Database, Mail, Clock, AlertTriangle, CheckCircle2, XCircle,
  Activity, Loader2, RefreshCw, ExternalLink, Users,
  CalendarCheck, Sparkles, ShieldCheck, Send, Zap,
} from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Health = {
  checkedAt: string
  database: { status: 'up' | 'down'; latencyMs: number; provider: string }
  email: {
    smtpConfigured: boolean
    queueSize: number
    deadLetters: number
    ultimaOK: string | null
    ultimaFallita: string | null
    fallite24h: number
  }
  cron: { nome: string; lastRun: string | null; oreFa: number; status: string; dettagli: string | null }[]
  errori: { total24h: number; deadLetterEmails: number }
}

type Metrics = {
  hostTotali: number
  hostAttivi: number
  hostInProva: number
  hostScaduti: number
  prenotazioniOggi: number
  checkinOggi: number
  appuntamentiSpaOggi: number
  emailOggi: { ok: number; fallite: number }
  apiCalls60m: number
  erroriRecenti: {
    id: string; azione: string; dettagli: string | null
    hostId: string | null; hostNome: string | null; createdAt: string
  }[]
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Monitoring() {
  const [health, setHealth] = useState<Health | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = useCallback(async () => {
    setRefreshing(true)
    const [h, m] = await Promise.all([
      fetch('/api/superadmin/health').then((r) => r.json()),
      fetch('/api/superadmin/metrics').then((r) => r.json()).catch(() => null),
    ])
    setHealth(h)
    setMetrics(m)
    setRefreshing(false)
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh ogni 30s
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Refresh header */}
      <div className="flex items-center justify-end gap-3 text-xs text-gray-500">
        <span>Ultimo aggiornamento: {format(lastRefresh, 'HH:mm:ss', { locale: it })}</span>
        <button onClick={load} disabled={refreshing}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 font-medium">
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Aggiorna
        </button>
      </div>

      {/* ═══ Health Check ═══ */}
      {health && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Health check</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <HealthCard
              icon={<Database />}
              label="Database"
              status={health.database.status === 'up' ? 'ok' : 'error'}
              value={`${health.database.latencyMs}ms`}
              sub={health.database.provider}
            />
            <HealthCard
              icon={<Mail />}
              label="Email / SMTP"
              status={health.email.smtpConfigured
                ? (health.email.fallite24h > 5 ? 'warn' : 'ok')
                : 'warn'}
              value={health.email.smtpConfigured ? 'Configurato' : 'Non configurato'}
              sub={health.email.ultimaOK
                ? `Ultimo OK: ${format(new Date(health.email.ultimaOK), 'HH:mm', { locale: it })}`
                : 'Nessun invio recente'}
              extra={health.email.deadLetters > 0
                ? { label: `${health.email.deadLetters} in dead letter`, tone: 'warn' as const }
                : undefined}
            />
            <HealthCard
              icon={<AlertTriangle />}
              label="Errori 24h"
              status={health.errori.total24h > 20 ? 'error' : health.errori.total24h > 0 ? 'warn' : 'ok'}
              value={String(health.errori.total24h)}
              sub="audit log fallimenti"
            />
            <a
              href="https://sentry.io/organizations/otium/"
              target="_blank" rel="noopener noreferrer"
              className="card hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-start gap-3 group"
            >
              <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase">Sentry</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
                  Dashboard <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Error tracking + replay</p>
              </div>
            </a>
          </div>
        </section>
      )}

      {/* ═══ Cron Jobs ═══ */}
      {health && (
        <section className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-900">Cron jobs</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {health.cron.map((c) => (
              <div key={c.nome} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <StatusDot status={c.status} />
                <p className="font-mono text-gray-700 flex-1">cron.{c.nome}</p>
                <p className="text-xs text-gray-500 shrink-0">
                  {c.lastRun
                    ? `${format(new Date(c.lastRun), 'd MMM HH:mm', { locale: it })} · ${c.oreFa}h fa`
                    : 'Mai eseguito'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Metriche piattaforma ═══ */}
      {metrics && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Metriche piattaforma</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile icon={<Users />} label="Host attivi" value={metrics.hostAttivi} sub={`su ${metrics.hostTotali} totali`} tone="emerald" />
            <MetricTile icon={<Zap />} label="Host trial" value={metrics.hostInProva} sub={`${metrics.hostScaduti} scaduti`} tone="blue" />
            <MetricTile icon={<CalendarCheck />} label="Prenotazioni oggi" value={metrics.prenotazioniOggi} tone="brand" />
            <MetricTile icon={<ShieldCheck />} label="Check-in oggi" value={metrics.checkinOggi} tone="violet" />
            <MetricTile icon={<Sparkles />} label="Appuntamenti SPA" value={metrics.appuntamentiSpaOggi} tone="purple" />
            <MetricTile icon={<Send />} label="Email OK oggi" value={metrics.emailOggi.ok} sub={`${metrics.emailOggi.fallite} fallite`} tone="emerald" />
            <MetricTile icon={<Activity />} label="API calls 60m" value={metrics.apiCalls60m} tone="amber" />
          </div>
        </section>
      )}

      {/* ═══ Errori recenti ═══ */}
      {metrics && (
        <section className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-gray-900">Errori recenti (24h)</h2>
            <span className="ml-auto text-xs text-gray-400">{metrics.erroriRecenti.length} errori</span>
          </div>
          {metrics.erroriRecenti.length === 0 ? (
            <p className="text-center py-10 text-sm text-gray-400">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
              Nessun errore negli ultimi 24 ore
            </p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50/80 backdrop-blur">
                  <tr>
                    <th className="table-th">Quando</th>
                    <th className="table-th">Host</th>
                    <th className="table-th">Azione</th>
                    <th className="table-th">Errore</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.erroriRecenti.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-red-50/30">
                      <td className="table-td text-xs text-gray-500">
                        {format(new Date(e.createdAt), 'd MMM HH:mm', { locale: it })}
                      </td>
                      <td className="table-td">{e.hostNome ?? <span className="text-gray-400">—</span>}</td>
                      <td className="table-td font-mono text-xs text-red-700">{e.azione}</td>
                      <td className="table-td text-xs text-gray-600 truncate max-w-md">
                        {e.dettagli ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function HealthCard({
  icon, label, status, value, sub, extra,
}: {
  icon: React.ReactNode
  label: string
  status: 'ok' | 'warn' | 'error'
  value: string
  sub: string
  extra?: { label: string; tone: 'warn' | 'error' }
}) {
  const statusCls = {
    ok: 'text-green-600 bg-green-50',
    warn: 'text-amber-600 bg-amber-50',
    error: 'text-red-600 bg-red-50',
  }[status]
  const StatusIcon = status === 'ok' ? CheckCircle2 : status === 'warn' ? AlertTriangle : XCircle

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${statusCls}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
            <StatusIcon className={`w-3 h-3 ${status === 'ok' ? 'text-green-500' : status === 'warn' ? 'text-amber-500' : 'text-red-500'}`} />
          </div>
          <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
          <p className="text-xs text-gray-500 truncate">{sub}</p>
          {extra && (
            <p className={`text-[10px] font-semibold mt-1 ${extra.tone === 'warn' ? 'text-amber-600' : 'text-red-600'}`}>
              ⚠ {extra.label}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'ok' ? 'bg-green-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500'
  return <div className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
}

function MetricTile({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  tone: 'brand' | 'emerald' | 'blue' | 'violet' | 'purple' | 'amber'
}) {
  const cm = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cm[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-extrabold text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-500">{label}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}
