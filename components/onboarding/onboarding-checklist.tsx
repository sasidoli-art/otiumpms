'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Check, ChevronDown, ChevronUp, X, PartyPopper, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingChecklist, OnboardingTask } from '@/lib/onboarding'

// ─── localStorage keys ──────────────────────────────────────────────────────

const COLLAPSED_KEY = 'onboarding-checklist-collapsed'
const DISMISSED_KEY = 'onboarding-checklist-dismissed'
const CELEBRATED_KEY = 'onboarding-checklist-celebrated'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  checklist: OnboardingChecklist
  hostId: string
}

// ─── Priorità sort ──────────────────────────────────────────────────────────

const PRIO_ORDER: Record<string, number> = { alta: 0, media: 1, bassa: 2 }

function sortTasks(tasks: OnboardingTask[]): OnboardingTask[] {
  return [...tasks].sort((a, b) => {
    // Completed last
    if (a.completato !== b.completato) return a.completato ? 1 : -1
    // Then by priority
    return (PRIO_ORDER[a.priorita] ?? 9) - (PRIO_ORDER[b.priorita] ?? 9)
  })
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OnboardingChecklistBanner({ checklist, hostId }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [celebrated, setCelebrated] = useState(false)

  // Read localStorage state on mount
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(`${COLLAPSED_KEY}-${hostId}`) === '1')
      setDismissed(localStorage.getItem(`${DISMISSED_KEY}-${hostId}`) === '1')
      setCelebrated(localStorage.getItem(`${CELEBRATED_KEY}-${hostId}`) === '1')
    } catch {}
  }, [hostId])

  const { tasks, percentualeCompletamento } = checklist
  const isComplete = percentualeCompletamento === 100
  const sorted = useMemo(() => sortTasks(tasks), [tasks])

  // Dismiss permanently
  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(`${DISMISSED_KEY}-${hostId}`, '1') } catch {}
  }

  // Toggle collapse
  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(`${COLLAPSED_KEY}-${hostId}`, next ? '1' : '0') } catch {}
  }

  // Mark celebration as shown
  useEffect(() => {
    if (isComplete && !celebrated) {
      try { localStorage.setItem(`${CELEBRATED_KEY}-${hostId}`, '1') } catch {}
    }
  }, [isComplete, celebrated, hostId])

  // Don't show if dismissed, or if 100% and already celebrated in a previous session
  if (dismissed) return null
  if (isComplete && celebrated) return null

  // ── 100% celebration (one session only) ──
  if (isComplete) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
          <PartyPopper size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Configurazione completata!
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            La tua struttura è pronta al 100%.
          </p>
        </div>
        <button onClick={dismiss} className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-400 transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>
    )
  }

  // ── Collapsed mode ──
  if (collapsed) {
    return (
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">{percentualeCompletamento}%</span>
        </div>
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex-1 text-left">
          Configurazione: {percentualeCompletamento}%
        </span>
        <span className="text-xs text-blue-500">Mostra dettagli</span>
        <ChevronDown size={14} className="text-blue-400" />
      </button>
    )
  }

  // ── Expanded mode ──
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Completa la configurazione
          </h3>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
            {percentualeCompletamento}%
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={toggleCollapse} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors" title="Comprimi">
            <ChevronUp size={14} />
          </button>
          <button onClick={dismiss} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors" title="Non mostrare più">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${percentualeCompletamento}%` }}
        />
      </div>

      {/* Tasks grid */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sorted.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

// ─── Task card ──────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: OnboardingTask }) {
  return (
    <div className={cn(
      'flex items-start gap-2.5 p-3 rounded-lg border transition-colors',
      task.completato
        ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/50'
        : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
    )}>
      {/* Checkbox */}
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
        task.completato
          ? 'bg-emerald-500 border-emerald-500'
          : 'border-slate-300 dark:border-slate-600',
      )}>
        {task.completato && <Check size={10} className="text-white" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium',
          task.completato
            ? 'text-slate-400 dark:text-slate-500 line-through'
            : 'text-slate-800 dark:text-slate-200',
        )}>
          {task.titolo}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
          {task.descrizione}
        </p>
        {!task.completato && (
          <Link
            href={task.href}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1.5"
          >
            Configura <ArrowRight size={10} />
          </Link>
        )}
      </div>
    </div>
  )
}
