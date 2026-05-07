'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, addMonths, subMonths, parseISO, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  BarChart3, ChevronLeft, ChevronRight, Euro, Clock,
  TrendingDown, CalendarClock, ArrowLeft, Award
} from 'lucide-react'
import { formatValuta, cn } from '@/lib/utils'

// ---- Types ----------------------------------------------------------------

interface Kpi {
  totaleAppt: number
  apptAttivi: number
  cancellazioni: number
  tassoCancellazione: number
  revenue: number
  durataOre: number
}

interface TerapistaRevenue {
  terapistaId: string
  nome: string
  colore: string
  count: number
  revenue: number
  durataMinuti: number
  avgTicket: number
}

interface CabinaOccupancy {
  cabinaId: string
  nome: string
  colore: string
  count: number
  minUsati: number
  minDisponibili: number
  occupancyPct: number
}

interface TopTrattamento {
  trattamentoId: string | null
  nome: string
  categoria: string
  count: number
  revenue: number
}

interface GiornoCount {
  giorno: number
  count: number
}

interface Props {
  mese: string
  kpi: Kpi
  revenuePerTerapista: TerapistaRevenue[]
  occupancyCabine: CabinaOccupancy[]
  topTrattamenti: TopTrattamento[]
  perGiorno: GiornoCount[]
}

// ---- Helpers ---------------------------------------------------------------

const CATEGORIA_LABEL: Record<string, string> = {
  MASSAGGIO: 'Massaggio',
  VISO: 'Viso',
  CORPO: 'Corpo',
  RITUALI: 'Rituali',
  BAGNI: 'Bagni',
  COPPIA: 'Coppia',
  ALTRO: 'Altro',
  PERCORSO: 'Percorso',
  '': 'Percorso',
}

const CATEGORIA_COLOR: Record<string, string> = {
  MASSAGGIO: 'bg-violet-100 text-violet-800',
  VISO: 'bg-pink-100 text-pink-800',
  CORPO: 'bg-teal-100 text-teal-800',
  RITUALI: 'bg-amber-100 text-amber-800',
  BAGNI: 'bg-sky-100 text-sky-800',
  COPPIA: 'bg-rose-100 text-rose-800',
  ALTRO: 'bg-gray-100 text-gray-700',
  PERCORSO: 'bg-purple-100 text-purple-800',
  '': 'bg-purple-100 text-purple-800',
}

function formatDurata(minuti: number): string {
  if (minuti < 60) return `${minuti}m`
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ---- Component ------------------------------------------------------------

export default function SpaReportClient({
  mese, kpi, revenuePerTerapista, occupancyCabine, topTrattamenti, perGiorno,
}: Props) {
  const router = useRouter()

  const dataCorrente = parseISO(mese + '-01')
  const mesePrecedente = format(subMonths(dataCorrente, 1), 'yyyy-MM')
  const meseSuccessivo = format(addMonths(dataCorrente, 1), 'yyyy-MM')
  const meseCorrente = format(startOfMonth(new Date()), 'yyyy-MM')
  const titoloMese = format(dataCorrente, 'MMMM yyyy', { locale: it })

  const maxTerapistaRevenue = Math.max(...revenuePerTerapista.map(t => t.revenue), 1)
  const maxGiorno = Math.max(...perGiorno.map(g => g.count), 1)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/host/spa" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report SPA</h1>
            <p className="text-sm text-gray-500 capitalize">{titoloMese}</p>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/host/spa/report?mese=${mesePrecedente}`)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="px-4 py-2 text-sm font-medium text-gray-700 capitalize min-w-[160px] text-center">
            {titoloMese}
          </span>
          <button
            onClick={() => router.push(`/host/spa/report?mese=${meseSuccessivo}`)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
          {mese !== meseCorrente && (
            <button
              onClick={() => router.push('/host/spa/report')}
              className="px-3 py-2 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
            >
              Mese corrente
            </button>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile
          label="Appuntamenti"
          value={kpi.apptAttivi}
          sub={`${kpi.totaleAppt} totali`}
          icon={<CalendarClock className="h-5 w-5 text-violet-600" />}
          color="bg-violet-50 border-violet-200"
        />
        <KpiTile
          label="Revenue"
          value={formatValuta(kpi.revenue)}
          sub={kpi.apptAttivi > 0 ? `avg ${formatValuta(kpi.revenue / kpi.apptAttivi)}` : '—'}
          icon={<Euro className="h-5 w-5 text-green-600" />}
          color="bg-green-50 border-green-200"
        />
        <KpiTile
          label="Ore erogate"
          value={`${kpi.durataOre}h`}
          sub={kpi.apptAttivi > 0 ? `avg ${Math.round((kpi.durataOre * 60) / kpi.apptAttivi)}m / appt` : '—'}
          icon={<Clock className="h-5 w-5 text-sky-600" />}
          color="bg-sky-50 border-sky-200"
        />
        <KpiTile
          label="Cancellazioni"
          value={`${kpi.tassoCancellazione}%`}
          sub={`${kpi.cancellazioni} su ${kpi.totaleAppt}`}
          icon={<TrendingDown className="h-5 w-5 text-red-500" />}
          color="bg-red-50 border-red-200"
        />
      </div>

      {/* Daily trend */}
      {perGiorno.length > 0 && (
        <Section title="Trend giornaliero" subtitle="Appuntamenti completati per giorno del mese">
          <div className="flex items-end gap-1 h-24 pt-2">
            {perGiorno.map(({ giorno, count }) => (
              <div key={giorno} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div
                  className="w-full rounded-t-sm bg-purple-400 transition-all"
                  style={{ height: count > 0 ? `${Math.max(4, Math.round((count / maxGiorno) * 80))}px` : '2px', opacity: count > 0 ? 1 : 0.3 }}
                  title={`${giorno}: ${count} appt`}
                />
                {perGiorno.length <= 15 ? (
                  <span className="text-[9px] text-gray-400">{giorno}</span>
                ) : giorno % 5 === 0 ? (
                  <span className="text-[9px] text-gray-400">{giorno}</span>
                ) : (
                  <span className="text-[9px] text-transparent">·</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Revenue per terapista */}
      {revenuePerTerapista.length > 0 ? (
        <Section title="Revenue per terapista" subtitle="Solo appuntamenti completati nel periodo">
          <div className="space-y-3">
            {revenuePerTerapista.map((t) => (
              <div key={t.terapistaId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.colore }}
                    />
                    <span className="font-medium text-gray-800">{t.nome}</span>
                    <span className="text-gray-400 text-xs">({t.count} appt · {formatDurata(t.durataMinuti)})</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-xs text-gray-500 hidden sm:block">avg {formatValuta(t.avgTicket)}</span>
                    <span className="font-semibold text-gray-900">{formatValuta(t.revenue)}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((t.revenue / maxTerapistaRevenue) * 100)}%`,
                      backgroundColor: t.colore,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section title="Revenue per terapista" subtitle="Solo appuntamenti completati nel periodo">
          <EmptyState label="Nessun dato nel periodo selezionato" />
        </Section>
      )}

      {/* Occupancy cabine */}
      {occupancyCabine.length > 0 ? (
        <Section
          title="Occupazione cabine"
          subtitle="Basato su 10h disponibili al giorno per cabina"
        >
          <div className="space-y-3">
            {occupancyCabine.map((c) => (
              <div key={c.cabinaId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.colore }}
                    />
                    <span className="font-medium text-gray-800">{c.nome}</span>
                    <span className="text-gray-400 text-xs">({c.count} appt · {formatDurata(c.minUsati)})</span>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      c.occupancyPct >= 70 ? 'text-green-600' :
                      c.occupancyPct >= 40 ? 'text-amber-600' :
                      'text-red-500'
                    )}
                  >
                    {c.occupancyPct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${c.occupancyPct}%`, backgroundColor: c.colore }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section title="Occupazione cabine" subtitle="Basato su 10h disponibili al giorno per cabina">
          <EmptyState label="Nessun dato nel periodo selezionato" />
        </Section>
      )}

      {/* Top trattamenti */}
      {topTrattamenti.length > 0 ? (
        <Section title="Top trattamenti" subtitle="Servizi più prenotati nel periodo">
          <div className="space-y-2">
            {topTrattamenti.map((t, i) => (
              <div key={t.trattamentoId ?? `percorso-${i}`} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                  {i === 0 ? (
                    <Award className="h-5 w-5 text-amber-500" />
                  ) : (
                    <span className="text-sm font-bold text-gray-400">#{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{t.nome}</span>
                    <span className={cn('px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0', CATEGORIA_COLOR[t.categoria] ?? 'bg-gray-100 text-gray-700')}>
                      {CATEGORIA_LABEL[t.categoria] ?? t.categoria}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right flex-shrink-0">
                  <span className="text-xs text-gray-500 hidden sm:block">{t.count} prenotazioni</span>
                  <span className="text-sm font-semibold text-gray-900">{formatValuta(t.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section title="Top trattamenti" subtitle="Servizi più prenotati nel periodo">
          <EmptyState label="Nessun dato nel periodo selezionato" />
        </Section>
      )}
    </div>
  )
}

// ---- Sub-components -------------------------------------------------------

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function KpiTile({ label, value, sub, icon, color }: {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className={cn('rounded-xl border p-4', color)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-8 text-sm text-gray-400">{label}</div>
  )
}
