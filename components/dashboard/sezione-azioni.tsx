'use client'

import Link from 'next/link'
import {
  BookOpen, UserCheck, Sparkles, AlertTriangle,
  MessageSquare, Clock, FileText, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/hooks/use-dashboard'

// ─── Chip config ────────────────────────────────────────────────────────────

interface ChipDef {
  key: keyof DashboardData['azioni']
  icon: typeof BookOpen
  label: (n: number) => string
  href: string
  color: string // tailwind color name
  urgent?: boolean
}

const CHIPS: ChipDef[] = [
  {
    key: 'manutenzioneUrgente',
    icon: AlertTriangle,
    label: n => `${n} manutenzion${n === 1 ? 'e urgente' : 'i urgenti'}`,
    href: '/host/manutenzione?priorita=URGENTE',
    color: 'red',
    urgent: true,
  },
  {
    key: 'prenotazioniDaConfermare',
    icon: BookOpen,
    label: n => `${n} prenotazion${n === 1 ? 'e' : 'i'} da confermare`,
    href: '/host/prenotazioni?stato=RICHIESTA',
    color: 'amber',
  },
  {
    key: 'checkinDaVerificare',
    icon: UserCheck,
    label: n => `${n} check-in da verificare`,
    href: '/host/oggi',
    color: 'blue',
  },
  {
    key: 'taskHKAperti',
    icon: Sparkles,
    label: n => `${n} camer${n === 1 ? 'a' : 'e'} da pulire`,
    href: '/host/housekeeping',
    color: 'purple',
  },
  {
    key: 'messaggiNonLetti',
    icon: MessageSquare,
    label: n => `${n} messagg${n === 1 ? 'io' : 'i'} non lett${n === 1 ? 'o' : 'i'}`,
    href: '/host/concierge',
    color: 'teal',
  },
  {
    key: 'traceScadutiOggi',
    icon: Clock,
    label: n => `${n} promemoria scadut${n === 1 ? 'o' : 'i'}`,
    href: '/host/promemoria?stato=APERTO',
    color: 'orange',
  },
  {
    key: 'fattureDaEmettere',
    icon: FileText,
    label: n => `${n} fattur${n === 1 ? 'a' : 'e'} da emettere`,
    href: '/host/fatture',
    color: 'slate',
  },
]

// ─── Color map ──────────────────────────────────────────────────────────────

const COLORS: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  red:    { bg: 'bg-red-50 dark:bg-red-950/30',       border: 'border-l-red-500',    icon: 'text-red-500',    text: 'text-red-800 dark:text-red-300' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-l-amber-500',  icon: 'text-amber-500',  text: 'text-amber-800 dark:text-amber-300' },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/30',     border: 'border-l-blue-500',   icon: 'text-blue-500',   text: 'text-blue-800 dark:text-blue-300' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-l-purple-500', icon: 'text-purple-500', text: 'text-purple-800 dark:text-purple-300' },
  teal:   { bg: 'bg-teal-50 dark:bg-teal-950/30',     border: 'border-l-teal-500',   icon: 'text-teal-500',   text: 'text-teal-800 dark:text-teal-300' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-l-orange-500', icon: 'text-orange-500', text: 'text-orange-800 dark:text-orange-300' },
  slate:  { bg: 'bg-slate-50 dark:bg-slate-800/50',   border: 'border-l-slate-400',  icon: 'text-slate-500',  text: 'text-slate-700 dark:text-slate-300' },
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  azioni: DashboardData['azioni']
}

export function SezioneAzioni({ azioni }: Props) {
  const activeChips = CHIPS.filter(chip => azioni[chip.key] > 0)

  // All clear
  if (activeChips.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
          <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Tutto in ordine! Nessuna azione richiesta.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {activeChips.map(chip => {
        const count = azioni[chip.key]
        const c = COLORS[chip.color] || COLORS.slate
        const Icon = chip.icon

        return (
          <Link
            key={chip.key}
            href={chip.href}
            className={cn(
              'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border-l-[3px] min-h-[48px]',
              'transition-all duration-150 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
              'w-full sm:w-auto',
              c.bg, c.border,
            )}
          >
            <Icon size={16} className={cn(c.icon, 'shrink-0')} />
            <span className={cn('text-sm font-semibold', c.text)}>
              {chip.label(count)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
