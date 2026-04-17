'use client'

import Link from 'next/link'
import {
  BookOpen, UserCheck, MessageSquare, Wrench, Flower2,
  CreditCard, Activity, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/hooks/use-dashboard'

// ─── Icon + color per tipo ──────────────────────────────────────────────────

const TIPO_CONFIG: Record<string, { icon: typeof BookOpen; color: string; dot: string }> = {
  prenotazione: { icon: BookOpen,       color: 'text-blue-500',    dot: 'bg-blue-500' },
  checkin:      { icon: UserCheck,      color: 'text-emerald-500', dot: 'bg-emerald-500' },
  messaggio:    { icon: MessageSquare,  color: 'text-teal-500',    dot: 'bg-teal-500' },
  manutenzione: { icon: Wrench,         color: 'text-orange-500',  dot: 'bg-orange-500' },
  spa:          { icon: Flower2,        color: 'text-violet-500',  dot: 'bg-violet-500' },
  pagamento:    { icon: CreditCard,     color: 'text-emerald-500', dot: 'bg-emerald-500' },
}

const DEFAULT_CONFIG = { icon: Activity, color: 'text-slate-400', dot: 'bg-slate-400' }

// ─── Relative time ──────────────────────────────────────────────────────────

function tempoRelativo(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))

  if (diffSec < 60) return 'ora'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min fa`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} or${Math.floor(diffSec / 3600) === 1 ? 'a' : 'e'} fa`
  const days = Math.floor(diffSec / 86400)
  return `${days} giorn${days === 1 ? 'o' : 'i'} fa`
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  attivita: DashboardData['attivitaRecente']
}

const MAX_VISIBLE = 8

export function SezioneAttivita({ attivita }: Props) {
  const items = attivita.slice(0, MAX_VISIBLE)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Attività recente
        </h3>
        <Link
          href="/host/audit"
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Mostra tutto <ChevronRight size={12} className="inline" />
        </Link>
      </div>

      {/* Timeline */}
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-slate-400">Nessuna attività recente</p>
        </div>
      ) : (
        <div className="px-4 py-2">
          {items.map((item, i) => (
            <TimelineRow key={`${item.tempo}-${i}`} item={item} isLast={i === items.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Timeline row ───────────────────────────────────────────────────────────

function TimelineRow({ item, isLast }: { item: DashboardData['attivitaRecente'][number]; isLast: boolean }) {
  const cfg = TIPO_CONFIG[item.tipo] || DEFAULT_CONFIG
  const Icon = cfg.icon

  const content = (
    <>
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
        {!isLast && (
          <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" style={{ minHeight: 24 }} />
        )}
      </div>
      <div className="shrink-0 mt-0.5">
        <Icon size={14} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-300 truncate leading-snug">
          {item.testo}
        </p>
      </div>
      <span className="text-[11px] text-slate-400 shrink-0 mt-0.5 tabular-nums">
        {tempoRelativo(item.tempo)}
      </span>
    </>
  )

  const baseClass = 'flex items-start gap-3 py-2.5'

  if (item.linkUrl) {
    return (
      <Link href={item.linkUrl} className={cn(baseClass, 'hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-lg transition-colors')}>
        {content}
      </Link>
    )
  }

  return <div className={baseClass}>{content}</div>
}
