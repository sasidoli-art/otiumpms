'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format, addMonths, subMonths, parseISO, startOfMonth } from 'date-fns'
import { useTranslations } from 'next-intl'
import { it } from 'date-fns/locale'
import {
  BarChart3, ChevronLeft, ChevronRight, Users, Euro, Clock,
  TrendingDown, CalendarClock, ArrowLeft, Award, Flame, UserCheck,
  Gift, Crown, ListChecks, AlertTriangle, ArrowRightLeft, Ban, Loader2
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
  avgTicket?: number
  ospitiUnici?: number
  noShow?: number
}

// ─── Advanced KPI types ─────────────────────────────────────────────────────

interface AdvancedKpi {
  revenueByCategory: { categoria: string; count: number; revenue: number }[]
  therapistUtilization: { terapistaId: string; nome: string; minLavorati: number; minDisponibili: number; utilizzo: number; appuntamenti: number }[]
  peakHours: { ora: number; count: number }[]
  giftCards: { totaleEmesse: number; valoreOriginale: number; saldoResiduo: number; utilizzateNelPeriodo: number; revenueNelPeriodo: number }
  loyalty: { totaleMembri: number; puntiEmessiPeriodo: number; puntiUtilizzatiPeriodo: number; nomeProgram: string | null }
  waitingListConversion: { totale: number; prenotati: number; tassoConversione: number }
  turnawayAnalysis: { motivo: string; label: string; count: number }[]
  turnawayTotale: number
  crossSell: { prenotazioniHotel: number; ospitiSpa: number; tasso: number }
  cancellationImpact: { cancellazioni: number; noShow: number; totale: number; revenuePersa: number }
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
  const t = useTranslations('spa.report')
  const tc = useTranslations('common')
  const router = useRouter()

  const dataCorrente = parseISO(mese + '-01')
  const mesePrecedente = format(subMonths(dataCorrente, 1), 'yyyy-MM')
  const meseSuccessivo = format(addMonths(dataCorrente, 1), 'yyyy-MM')
  const meseCorrente = format(startOfMonth(new Date()), 'yyyy-MM')
  const titoloMese = format(dataCorrente, 'MMMM yyyy', { locale: it })

  const maxTerapistaRevenue = Math.max(...revenuePerTerapista.map(t => t.revenue), 1)
  const maxGiorno = Math.max(...perGiorno.map(g => g.count), 1)

  // ─── Advanced KPI fetch ─────────────────────────────────────────────────
  const [advanced, setAdvanced] = useState<AdvancedKpi | null>(null)
  const [advancedLoading, setAdvancedLoading] = useState(true)

  useEffect(() => {
    setAdvancedLoading(true)
    fetch(`/api/host/spa/report/advanced?mese=${mese}`)
      .then((r) => r.json())
      .then((data) => setAdvanced(data))
      .catch(() => {})
      .finally(() => setAdvancedLoading(false))
  }, [mese])

  const maxPeakHour = advanced ? Math.max(...advanced.peakHours.map((h) => h.count), 1) : 1

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
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
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

      {/* ─── Advanced Sections ────────────────────────────────────────── */}

      {advancedLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          <span className="ml-2 text-sm text-gray-400">Caricamento report avanzati...</span>
        </div>
      ) : advanced && (
        <>
          {/* Revenue by treatment category */}
          {advanced.revenueByCategory.length > 0 && (
            <Section title="Revenue per categoria trattamento" subtitle="Ripartizione per tipo di servizio">
              <div className="space-y-3">
                {advanced.revenueByCategory.map((cat) => {
                  const maxCatRevenue = Math.max(...advanced.revenueByCategory.map((c) => c.revenue), 1)
                  return (
                    <div key={cat.categoria} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={cn('px-1.5 py-0.5 text-xs font-medium rounded', CATEGORIA_COLOR[cat.categoria] ?? 'bg-gray-100 text-gray-700')}>
                            {CATEGORIA_LABEL[cat.categoria] ?? cat.categoria}
                          </span>
                          <span className="text-gray-400 text-xs">({cat.count} appuntamenti)</span>
                        </div>
                        <span className="font-semibold text-gray-900">{formatValuta(cat.revenue)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all"
                          style={{ width: `${Math.round((cat.revenue / maxCatRevenue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Therapist utilization */}
          {advanced.therapistUtilization.length > 0 && (
            <Section title="Utilizzo terapisti" subtitle="Ore lavorate / ore disponibili (8h/giorno stimate)">
              <div className="space-y-3">
                {advanced.therapistUtilization.map((t) => (
                  <div key={t.terapistaId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium text-gray-800">{t.nome}</span>
                        <span className="text-gray-400 text-xs">({t.appuntamenti} appt · {formatDurata(t.minLavorati)})</span>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          t.utilizzo >= 70 ? 'text-green-600' :
                          t.utilizzo >= 40 ? 'text-amber-600' :
                          'text-red-500'
                        )}
                      >
                        {t.utilizzo}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${t.utilizzo}%`,
                          backgroundColor: t.utilizzo >= 70 ? '#16a34a' : t.utilizzo >= 40 ? '#d97706' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Peak hours heatmap */}
          <Section title="Ore di punta" subtitle="Distribuzione appuntamenti per ora del giorno">
            <div className="flex items-end gap-1 h-28 pt-2">
              {advanced.peakHours
                .filter((h) => h.ora >= 7 && h.ora <= 21)
                .map(({ ora, count }) => (
                  <div key={ora} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{
                        height: count > 0 ? `${Math.max(4, Math.round((count / maxPeakHour) * 90))}px` : '2px',
                        backgroundColor: count > 0
                          ? count / maxPeakHour > 0.7
                            ? '#ef4444'
                            : count / maxPeakHour > 0.4
                            ? '#f59e0b'
                            : '#8b5cf6'
                          : '#e5e7eb',
                        opacity: count > 0 ? 1 : 0.3,
                      }}
                      title={`${ora}:00 — ${count} appuntamenti`}
                    />
                    <span className="text-[9px] text-gray-400">{ora}</span>
                  </div>
                ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-purple-500 inline-block" /> Basso</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-500 inline-block" /> Medio</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-500 inline-block" /> Alto</span>
            </div>
          </Section>

          {/* Mini KPI grid: Gift Card, Loyalty, Waiting List, Cross-sell, Cancellations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gift Card Stats */}
            <Section title="Gift Card" subtitle="Statistiche carte regalo">
              <div className="grid grid-cols-2 gap-3">
                <MiniKpi label="Emesse" value={String(advanced.giftCards.totaleEmesse)} icon={<Gift className="h-4 w-4 text-pink-500" />} />
                <MiniKpi label="Valore totale" value={formatValuta(advanced.giftCards.valoreOriginale)} icon={<Euro className="h-4 w-4 text-green-500" />} />
                <MiniKpi label="Saldo residuo" value={formatValuta(advanced.giftCards.saldoResiduo)} icon={<Euro className="h-4 w-4 text-amber-500" />} />
                <MiniKpi label="Revenue periodo" value={formatValuta(advanced.giftCards.revenueNelPeriodo)} icon={<Flame className="h-4 w-4 text-orange-500" />} />
              </div>
            </Section>

            {/* Loyalty Stats */}
            <Section title="Fedeltà" subtitle={advanced.loyalty.nomeProgram ?? 'Programma fedeltà'}>
              <div className="grid grid-cols-2 gap-3">
                <MiniKpi label="Membri" value={String(advanced.loyalty.totaleMembri)} icon={<Crown className="h-4 w-4 text-amber-500" />} />
                <MiniKpi label="Punti emessi" value={advanced.loyalty.puntiEmessiPeriodo.toLocaleString('it-IT')} icon={<TrendingDown className="h-4 w-4 text-green-500" style={{ transform: 'rotate(180deg)' }} />} />
                <MiniKpi label="Punti utilizzati" value={advanced.loyalty.puntiUtilizzatiPeriodo.toLocaleString('it-IT')} icon={<Gift className="h-4 w-4 text-purple-500" />} />
                <MiniKpi
                  label="Tasso utilizzo"
                  value={
                    advanced.loyalty.puntiEmessiPeriodo > 0
                      ? `${Math.round((advanced.loyalty.puntiUtilizzatiPeriodo / advanced.loyalty.puntiEmessiPeriodo) * 100)}%`
                      : '—'
                  }
                  icon={<Users className="h-4 w-4 text-sky-500" />}
                />
              </div>
            </Section>

            {/* Waiting List Conversion */}
            <Section title="Conversione lista d'attesa" subtitle="Da richiesta a prenotazione confermata">
              <div className="grid grid-cols-3 gap-3">
                <MiniKpi label="In attesa" value={String(advanced.waitingListConversion.totale)} icon={<ListChecks className="h-4 w-4 text-sky-500" />} />
                <MiniKpi label="Prenotati" value={String(advanced.waitingListConversion.prenotati)} icon={<Award className="h-4 w-4 text-green-500" />} />
                <MiniKpi label="Tasso" value={`${advanced.waitingListConversion.tassoConversione}%`} icon={<ArrowRightLeft className="h-4 w-4 text-purple-500" />} />
              </div>
            </Section>

            {/* Cross-sell Rate */}
            <Section title="Cross-sell hotel → SPA" subtitle="% ospiti hotel che prenotano anche la SPA">
              <div className="grid grid-cols-3 gap-3">
                <MiniKpi label="Pren. hotel" value={String(advanced.crossSell.prenotazioniHotel)} icon={<Users className="h-4 w-4 text-sky-500" />} />
                <MiniKpi label="Ospiti SPA" value={String(advanced.crossSell.ospitiSpa)} icon={<Flame className="h-4 w-4 text-purple-500" />} />
                <MiniKpi label="Tasso" value={`${advanced.crossSell.tasso}%`} icon={<ArrowRightLeft className="h-4 w-4 text-green-500" />} />
              </div>
            </Section>
          </div>

          {/* Turnaway Analysis */}
          {advanced.turnawayTotale > 0 && (
            <Section title="Analisi turnaway" subtitle={`${advanced.turnawayTotale} richieste rifiutate nel periodo`}>
              <div className="space-y-2">
                {advanced.turnawayAnalysis.map((t) => (
                  <div key={t.motivo} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-gray-800">{t.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${Math.round((t.count / advanced.turnawayTotale) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-10 text-right">{t.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Cancellation Impact */}
          <Section title="Impatto cancellazioni" subtitle="Revenue persa per cancellazioni e no-show">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniKpi label="Cancellazioni" value={String(advanced.cancellationImpact.cancellazioni)} icon={<Ban className="h-4 w-4 text-red-500" />} />
              <MiniKpi label="No-show" value={String(advanced.cancellationImpact.noShow)} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
              <MiniKpi label="Totale persi" value={String(advanced.cancellationImpact.totale)} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
              <MiniKpi label="Revenue persa" value={formatValuta(advanced.cancellationImpact.revenuePersa)} icon={<Euro className="h-4 w-4 text-red-500" />} />
            </div>
          </Section>
        </>
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

function MiniKpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  )
}
