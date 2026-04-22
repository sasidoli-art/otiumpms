'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Users, TrendingUp, TrendingDown, UserCheck, CreditCard, AlertCircle,
  UserPlus, Zap, Clock, LifeBuoy, ChevronRight, Loader2, Activity,
  CheckCircle2, XCircle,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type DashboardData = {
  kpi: {
    hostTotali: number
    hostNuoviQuestoMese: number
    hostAttivi: number
    mrr: number
    churn: number
    cancellatiUltimi30gg: number
    mesePrecedenteAttivi: number
  }
  serieMensile: { mese: string; mrr: number; hostAttivi: number }[]
  ultimiHost: {
    id: string
    nomeAzienda: string
    email: string
    userNome: string
    piano: string
    statoAbbonamento: string
    createdAt: string
    onboardingCompletato: boolean
    onboardingStep: number
  }[]
  azioniRichieste: {
    onboardingIncompleti: number
    abbonamentiInScadenza: number
    ticketAperti: number
  }
  feed: {
    id: string
    azione: string
    entita: string
    entitaId: string | null
    dettagli: string | null
    createdAt: string
    hostNome: string | null
    attore: string | null
  }[]
}

const PIANO_LABEL: Record<string, string> = {
  LIGHT: 'Light',
  EVENTO_SINGOLO: 'Evento',
  VISIBILITA_MENSILE: 'Visibilità',
  PARTNER_PREMIUM: 'Premium',
}

const STATO_CLS: Record<string, string> = {
  ATTIVO: 'bg-green-50 text-green-700',
  IN_PROVA: 'bg-blue-50 text-blue-700',
  SOSPESO: 'bg-amber-50 text-amber-700',
  SCADUTO: 'bg-red-50 text-red-700',
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card text-center py-10 text-red-600">
        Errore caricamento dashboard
      </div>
    )
  }

  const { kpi, serieMensile, ultimiHost, azioniRichieste, feed } = data

  return (
    <div className="space-y-6">
      {/* ═══ KPI BAR ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users />}
          color="brand"
          label="Host totali"
          value={kpi.hostTotali.toString()}
          delta={kpi.hostNuoviQuestoMese > 0 ? `+${kpi.hostNuoviQuestoMese} questo mese` : undefined}
        />
        <KpiCard
          icon={<UserCheck />}
          color="emerald"
          label="Host attivi"
          value={kpi.hostAttivi.toString()}
          delta="prenotazioni ultimi 30gg"
        />
        <KpiCard
          icon={<CreditCard />}
          color="blue"
          label="MRR"
          value={`€${kpi.mrr.toLocaleString('it-IT')}`}
          delta="Monthly Recurring Revenue"
        />
        <KpiCard
          icon={kpi.churn > 5 ? <TrendingDown /> : <TrendingUp />}
          color={kpi.churn > 5 ? 'red' : 'violet'}
          label="Churn"
          value={`${kpi.churn}%`}
          delta={`${kpi.cancellatiUltimi30gg} cancellati 30gg`}
        />
      </div>

      {/* ═══ Azioni richieste (badge counter) ═══════════════════════════════ */}
      {(azioniRichieste.onboardingIncompleti > 0 || azioniRichieste.abbonamentiInScadenza > 0 || azioniRichieste.ticketAperti > 0) && (
        <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <h2 className="text-sm font-bold text-amber-900 mb-3 uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Azioni richieste
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {azioniRichieste.onboardingIncompleti > 0 && (
              <ActionCard
                icon={<UserPlus className="w-5 h-5" />}
                label="Onboarding incompleti"
                sub="> 7 giorni"
                count={azioniRichieste.onboardingIncompleti}
                href="/admin/clienti?onboarding=incompleto"
                tone="amber"
              />
            )}
            {azioniRichieste.abbonamentiInScadenza > 0 && (
              <ActionCard
                icon={<Clock className="w-5 h-5" />}
                label="Abbonamenti in scadenza"
                sub="prossimi 7 giorni"
                count={azioniRichieste.abbonamentiInScadenza}
                href="/admin/clienti?filter=scadenza"
                tone="red"
              />
            )}
            {azioniRichieste.ticketAperti > 0 && (
              <ActionCard
                icon={<LifeBuoy className="w-5 h-5" />}
                label="Ticket aperti"
                sub="da processare"
                count={azioniRichieste.ticketAperti}
                href="/admin/ticket"
                tone="blue"
              />
            )}
          </div>
        </div>
      )}

      {/* ═══ Grafico MRR 12 mesi ═══════════════════════════════════════════ */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">MRR e host attivi</h2>
            <p className="text-xs text-gray-500">Ultimi 12 mesi</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serieMensile} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mese" stroke="#94a3b8" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                fontSize={11}
                tickFormatter={(v) => `€${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
              />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} />
              <Tooltip
                formatter={(v: number, name: string) => {
                  if (name === 'MRR') return [`€${v.toLocaleString('it-IT')}`, 'MRR']
                  return [v, 'Host attivi']
                }}
              />
              <Legend />
              <Line
                yAxisId="left" type="monotone" dataKey="mrr" name="MRR"
                stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right" type="monotone" dataKey="hostAttivi" name="Host attivi"
                stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ Ultimi host + Attività recente (2 col) ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ultimi host registrati */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-500" /> Ultimi host
            </h2>
            <Link href="/admin/clienti" className="text-xs text-brand-600 font-medium hover:underline">
              Vedi tutti →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
            {ultimiHost.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">Nessun host registrato</p>
            ) : ultimiHost.map((h) => (
              <Link
                key={h.id}
                href={`/admin/clienti/${h.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-500/5 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0 ring-1 ring-brand-500/10">
                  {h.nomeAzienda.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{h.nomeAzienda}</p>
                  <p className="text-xs text-gray-500 truncate">{h.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATO_CLS[h.statoAbbonamento] ?? 'bg-gray-100 text-gray-500'}`}>
                    {PIANO_LABEL[h.piano] ?? h.piano}
                  </span>
                  {h.onboardingCompletato ? (
                    <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Onboarded
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> Step {h.onboardingStep}/5
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Attività recente (feed) */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-500" /> Attività recente
            </h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
            {feed.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">Nessuna attività recente</p>
            ) : feed.map((f) => (
              <div key={f.id} className="flex items-start gap-3 px-5 py-3">
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${azioneTone(f.azione)}`}>
                  {azioneIcon(f.azione)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{f.hostNome ?? f.attore ?? 'Sistema'}</span>{' '}
                    <span className="text-gray-500">{azioneLabel(f.azione)}</span>
                  </p>
                  {f.dettagli && (
                    <p className="text-xs text-gray-500 truncate">{f.dettagli}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {format(new Date(f.createdAt), 'd MMM HH:mm', { locale: it })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon, color, label, value, delta,
}: {
  icon: React.ReactNode
  color: 'brand' | 'emerald' | 'blue' | 'violet' | 'red'
  label: string
  value: string
  delta?: string
}) {
  const colorMap = {
    brand: 'from-brand-500/20 to-brand-500/5 text-brand-600',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-600',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-600',
    red: 'from-red-500/20 to-red-500/5 text-red-600',
  }
  return (
    <div className="card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">{value}</p>
          {delta && <p className="text-xs text-gray-500 mt-1">{delta}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color]} ring-1 ring-inset ring-black/5`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── ActionCard ──────────────────────────────────────────────────────────────

function ActionCard({
  icon, label, sub, count, href, tone,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  count: number
  href: string
  tone: 'amber' | 'red' | 'blue'
}) {
  const toneMap = {
    amber: 'bg-amber-500 text-white',
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
  }
  return (
    <Link
      href={href}
      className="bg-white rounded-lg p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneMap[tone]} shadow-sm`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-[11px] text-gray-500">{sub}</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-extrabold text-gray-900">{count}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 shrink-0" />
    </Link>
  )
}

// ─── Helpers azione ──────────────────────────────────────────────────────────

function azioneLabel(a: string): string {
  const map: Record<string, string> = {
    'host.signup': 'si è registrato',
    'onboarding.completato': 'ha completato l\'onboarding',
    'abbonamento.attivato': 'ha attivato l\'abbonamento',
    'abbonamento.cancellato': 'ha cancellato l\'abbonamento',
    'modulo.attivato': 'ha attivato un modulo',
    'modulo.disattivato': 'ha disattivato un modulo',
    'ticket.creato': 'ha aperto un ticket',
    'pagamento.riuscito': 'ha effettuato un pagamento',
    'pagamento.online.riuscito': 'ha pagato online',
  }
  return map[a] ?? a
}

function azioneIcon(a: string): React.ReactNode {
  if (a === 'host.signup') return <UserPlus className="w-4 h-4" />
  if (a === 'onboarding.completato') return <CheckCircle2 className="w-4 h-4" />
  if (a.startsWith('abbonamento')) return <CreditCard className="w-4 h-4" />
  if (a.startsWith('modulo')) return <Zap className="w-4 h-4" />
  if (a.startsWith('ticket')) return <LifeBuoy className="w-4 h-4" />
  if (a.startsWith('pagamento')) return <CreditCard className="w-4 h-4" />
  return <Activity className="w-4 h-4" />
}

function azioneTone(a: string): string {
  if (a === 'host.signup' || a === 'onboarding.completato') return 'bg-emerald-50 text-emerald-600'
  if (a === 'abbonamento.cancellato') return 'bg-red-50 text-red-600'
  if (a.startsWith('abbonamento') || a.startsWith('pagamento')) return 'bg-blue-50 text-blue-600'
  if (a.startsWith('modulo')) return 'bg-violet-50 text-violet-600'
  if (a.startsWith('ticket')) return 'bg-amber-50 text-amber-600'
  return 'bg-gray-100 text-gray-500'
}
