'use client'

import Link from 'next/link'
import {
  BookOpen, UserCheck, MessageSquare, Wrench, Flower2,
  CreditCard, Activity, ChevronRight, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/hooks/use-dashboard'

// ─── Tipo → colore del dot sulla timeline ──────────────────────────────────

const TIPO_CONFIG: Record<string, { icon: LucideIcon; dot: string }> = {
  prenotazione: { icon: BookOpen,      dot: 'bg-info-500' },
  checkin:      { icon: UserCheck,     dot: 'bg-success-500' },
  messaggio:    { icon: MessageSquare, dot: 'bg-teal-500' },
  manutenzione: { icon: Wrench,        dot: 'bg-amber-500' },
  spa:          { icon: Flower2,       dot: 'bg-violet-500' },
  pagamento:    { icon: CreditCard,    dot: 'bg-success-500' },
}

const DEFAULT_CONFIG = { icon: Activity, dot: 'bg-neutral-400' }

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
    <section className="bg-white rounded-lg border border-neutral-150">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
        <h3 className="text-[14px] font-semibold text-neutral-900">
          Attività recente
        </h3>
        <Link
          href="/host/audit"
          className="inline-flex items-center gap-0.5 text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          Mostra tutto <ChevronRight size={12} />
        </Link>
      </header>

      {/* Timeline */}
      {items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-[13px] text-neutral-400">Nessuna attività recente</p>
        </div>
      ) : (
        <div className="relative px-5 py-2">
          {/* Linea verticale continua (1px) dietro tutti i pallini */}
          <span
            aria-hidden="true"
            className="absolute left-[26px] top-5 bottom-5 w-px bg-neutral-200"
          />
          {items.map((item, i) => (
            <TimelineRow key={`${item.tempo}-${i}`} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Timeline row ───────────────────────────────────────────────────────────

function TimelineRow({ item }: { item: DashboardData['attivitaRecente'][number] }) {
  const cfg = TIPO_CONFIG[item.tipo] || DEFAULT_CONFIG

  const content = (
    <>
      {/* Dot 8px sulla linea — posizione allineata al centro della riga */}
      <span className="relative flex items-center justify-center w-3 shrink-0">
        <span className={cn('w-2 h-2 rounded-full ring-2 ring-white', cfg.dot)} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-neutral-700 leading-snug">
          {item.testo}
        </p>
      </div>
      <span className="text-[12px] text-neutral-400 shrink-0 tabular-nums">
        {tempoRelativo(item.tempo)}
      </span>
    </>
  )

  const baseClass = 'flex items-center gap-3 py-3 -mx-2 px-2 rounded-md'

  if (item.linkUrl) {
    return (
      <Link
        href={item.linkUrl}
        className={cn(baseClass, 'hover:bg-neutral-50 transition-colors')}
      >
        {content}
      </Link>
    )
  }

  return <div className={baseClass}>{content}</div>
}
