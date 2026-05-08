import {
  Euro, BookOpen, TrendingUp, ArrowUp, ArrowDown, ArrowRight, type LucideIcon,
} from 'lucide-react'
import type { DashboardData } from '@/hooks/use-dashboard'
import { formatValuta } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export function SezioneKpi({ kpi }: { kpi: DashboardData['kpi'] }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/40">
        <KpiCell
          label="Ricavi del mese"
          value={formatValuta(kpi.ricaviMese)}
          delta={kpi.deltaRicaviPercent}
          icon={Euro}
          accent="emerald"
        />
        <KpiCell
          label="Prenotazioni"
          value={String(kpi.prenotazioniMese)}
          delta={kpi.deltaPrenotazioniPercent}
          icon={BookOpen}
          accent="blue"
        />
        <KpiCell
          label="ADR medio"
          hint="Avg Daily Rate"
          value={formatValuta(kpi.adrMese)}
          delta={kpi.deltaAdrPercent}
          icon={TrendingUp}
          accent="slate"
        />
        <KpiCell
          label="Mese scorso"
          hint="stesso periodo"
          value={formatValuta(kpi.ricaviMeseScorso)}
          delta={null}
          icon={Euro}
          accent="slate"
        />
      </div>
    </div>
  )
}

const ACCENT: Record<string, { dot: string; iconColor: string }> = {
  emerald: { dot: 'bg-emerald-500', iconColor: 'text-emerald-600' },
  blue:    { dot: 'bg-blue-500',    iconColor: 'text-blue-600'    },
  slate:   { dot: 'bg-slate-300',   iconColor: 'text-slate-400'   },
}

function KpiCell({
  label, hint, value, delta, icon: Icon, accent = 'slate',
}: {
  label: string
  hint?: string
  value: string
  delta: number | null
  icon: LucideIcon
  accent?: string
}) {
  const a = ACCENT[accent] ?? ACCENT.slate
  return (
    <div className="group relative px-6 py-5 transition-colors hover:bg-white/40">
      {/* top accent line */}
      <div className={cn('absolute top-0 left-6 right-6 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity', a.dot)} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Icon size={13} className={cn('shrink-0', a.iconColor)} strokeWidth={2.5} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
            {label}
          </span>
          {hint && (
            <span className="text-[10px] text-slate-300 hidden lg:inline">· {hint}</span>
          )}
        </div>
        <DeltaBadge delta={delta} />
      </div>

      <p className="text-[32px] leading-none font-bold tabular-nums tracking-[-0.03em] text-slate-900">
        {value}
      </p>
    </div>
  )
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null

  const isUp = delta > 0
  const isDown = delta < 0
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : ArrowRight
  const sign = delta > 0 ? '+' : ''

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold tabular-nums',
      isUp   ? 'bg-emerald-50 text-emerald-700' :
      isDown ? 'bg-red-50 text-red-600' :
               'bg-slate-100 text-slate-500',
    )}>
      <Icon size={10} strokeWidth={2.5} />
      {sign}{delta}%
    </span>
  )
}
