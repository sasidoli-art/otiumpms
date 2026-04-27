/**
 * SezioneKpi — strip 4 KPI mensili con delta vs mese scorso.
 *
 *   <SezioneKpi kpi={data.kpi} />
 *
 * Spec design (rif. /host/booking-engine task):
 *   - Icona 28px in cerchio 40px bg colorato tenue (sinistra)
 *   - Valore text-stat (32px/700/tabular-nums)
 *   - Label text-body-sm (13px/neutral-500)
 *   - Delta badge a destra: ↑ +12% (success) / ↓ -3% (error) / → 0% (neutral)
 *   - 4 in riga desktop, 2×2 tablet, 1 col mobile
 */
import {
  Euro, BookOpen, TrendingUp, ArrowUp, ArrowDown, ArrowRight, type LucideIcon,
} from 'lucide-react'
import type { DashboardData } from '@/hooks/use-dashboard'
import { formatValuta } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export function SezioneKpi({ kpi }: { kpi: DashboardData['kpi'] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Kpi
        label="Ricavi del mese"
        value={formatValuta(kpi.ricaviMese)}
        delta={kpi.deltaRicaviPercent}
        icon={Euro}
        tone="primary"
      />
      <Kpi
        label="Prenotazioni"
        value={String(kpi.prenotazioniMese)}
        delta={kpi.deltaPrenotazioniPercent}
        icon={BookOpen}
        tone="info"
      />
      <Kpi
        label="ADR medio"
        hint="Avg Daily Rate"
        value={formatValuta(kpi.adrMese)}
        delta={kpi.deltaAdrPercent}
        icon={TrendingUp}
        tone="success"
      />
      <Kpi
        label="Mese scorso"
        hint="Stesso periodo"
        value={formatValuta(kpi.ricaviMeseScorso)}
        delta={null}
        icon={Euro}
        tone="neutral"
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────

const TONE: Record<string, { iconBg: string; iconColor: string }> = {
  primary: { iconBg: 'bg-primary-50',  iconColor: 'text-primary-600' },
  success: { iconBg: 'bg-success-50',  iconColor: 'text-success-600' },
  info:    { iconBg: 'bg-info-50',     iconColor: 'text-info-600'    },
  neutral: { iconBg: 'bg-neutral-100', iconColor: 'text-neutral-500' },
}

function Kpi({
  label, hint, value, delta, icon: Icon, tone = 'primary',
}: {
  label: string
  hint?: string
  value: string
  delta: number | null
  icon: LucideIcon
  tone?: 'primary' | 'success' | 'info' | 'neutral'
}) {
  const t = TONE[tone] ?? TONE.primary
  return (
    <div className="bg-white rounded-lg border border-neutral-150 shadow-xs p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('shrink-0 w-10 h-10 rounded-md flex items-center justify-center', t.iconBg)}>
          <Icon size={20} className={t.iconColor} />
        </div>
        <DeltaBadge delta={delta} />
      </div>
      <p className="mt-4 text-[28px] leading-none font-bold tabular-nums tracking-[-0.02em] text-neutral-900">
        {value}
      </p>
      <p className="mt-1.5 text-[13px] text-neutral-500">
        {label}
        {hint && <span className="ml-1.5 text-[11px] text-neutral-400">· {hint}</span>}
      </p>
    </div>
  )
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null

  const isUp = delta > 0
  const isDown = delta < 0
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : ArrowRight
  const className = isUp
    ? 'bg-success-50 text-success-700'
    : isDown
      ? 'bg-error-50 text-error-700'
      : 'bg-neutral-100 text-neutral-500'
  const sign = delta > 0 ? '+' : ''

  return (
    <span className={cn('inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums', className)}>
      <Icon size={12} />
      {sign}{delta}%
    </span>
  )
}
