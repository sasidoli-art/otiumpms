'use client'

import Link from 'next/link'
import {
  BookOpen, UserCheck, Sparkles, AlertTriangle,
  MessageSquare, Clock, FileText, Check, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/hooks/use-dashboard'

// ─── Chip config ────────────────────────────────────────────────────────────

type ChipColor = 'error' | 'warning' | 'info' | 'purple' | 'teal' | 'amber' | 'neutral'

interface ChipDef {
  key: keyof DashboardData['azioni']
  icon: LucideIcon
  label: (n: number) => string
  href: string
  color: ChipColor
}

const CHIPS: ChipDef[] = [
  {
    key: 'manutenzioneUrgente',
    icon: AlertTriangle,
    label: n => `${n === 1 ? 'manutenzione urgente' : 'manutenzioni urgenti'}`,
    href: '/host/manutenzione?priorita=URGENTE',
    color: 'error',
  },
  {
    key: 'prenotazioniDaConfermare',
    icon: BookOpen,
    label: n => `${n === 1 ? 'prenotazione da confermare' : 'prenotazioni da confermare'}`,
    href: '/host/prenotazioni?stato=RICHIESTA',
    color: 'warning',
  },
  {
    key: 'checkinDaVerificare',
    icon: UserCheck,
    label: () => 'check-in da verificare',
    href: '/host/oggi',
    color: 'info',
  },
  {
    key: 'taskHKAperti',
    icon: Sparkles,
    label: n => `${n === 1 ? 'camera da pulire' : 'camere da pulire'}`,
    href: '/host/housekeeping',
    color: 'purple',
  },
  {
    key: 'messaggiNonLetti',
    icon: MessageSquare,
    label: n => `${n === 1 ? 'messaggio non letto' : 'messaggi non letti'}`,
    href: '/host/concierge',
    color: 'teal',
  },
  {
    key: 'traceScadutiOggi',
    icon: Clock,
    label: n => `${n === 1 ? 'promemoria scaduto' : 'promemoria scaduti'}`,
    href: '/host/promemoria?stato=APERTO',
    color: 'amber',
  },
  {
    key: 'fattureDaEmettere',
    icon: FileText,
    label: n => `${n === 1 ? 'fattura da emettere' : 'fatture da emettere'}`,
    href: '/host/fatture',
    color: 'neutral',
  },
]

// Design: bg bianco + icona colorata + counter inline. Hover: bg tinted del
// colore (alpha 5%), border colore (alpha 30%). NO border-left 3px.
const COLOR_CLASSES: Record<ChipColor, {
  icon: string
  badgeBg: string
  badgeText: string
  hover: string
}> = {
  error:   { icon: 'text-error-600',   badgeBg: 'bg-error-600',   badgeText: 'text-white', hover: 'hover:bg-error-50/60 hover:border-error-200' },
  warning: { icon: 'text-warning-600', badgeBg: 'bg-warning-600', badgeText: 'text-white', hover: 'hover:bg-warning-50/60 hover:border-warning-200' },
  info:    { icon: 'text-info-600',    badgeBg: 'bg-info-600',    badgeText: 'text-white', hover: 'hover:bg-info-50/60 hover:border-info-200' },
  purple:  { icon: 'text-violet-600',  badgeBg: 'bg-violet-600',  badgeText: 'text-white', hover: 'hover:bg-violet-50/60 hover:border-violet-200' },
  teal:    { icon: 'text-teal-600',    badgeBg: 'bg-teal-600',    badgeText: 'text-white', hover: 'hover:bg-teal-50/60 hover:border-teal-200' },
  amber:   { icon: 'text-amber-600',   badgeBg: 'bg-amber-600',   badgeText: 'text-white', hover: 'hover:bg-amber-50/60 hover:border-amber-200' },
  neutral: { icon: 'text-neutral-500', badgeBg: 'bg-neutral-700', badgeText: 'text-white', hover: 'hover:bg-neutral-50 hover:border-neutral-300' },
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  azioni: DashboardData['azioni']
}

export function SezioneAzioni({ azioni }: Props) {
  const activeChips = CHIPS.filter(chip => azioni[chip.key] > 0)

  // All clear → single "everything ok" pill
  if (activeChips.length === 0) {
    return (
      <div className="inline-flex items-center gap-2.5 h-10 px-4 rounded-full bg-success-50 text-success-700 border border-success-100">
        <Check size={14} className="text-success-600 shrink-0" />
        <span className="text-[13px] font-medium">Tutto in ordine</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {activeChips.map(chip => {
        const count = azioni[chip.key]
        const c = COLOR_CLASSES[chip.color]
        const Icon = chip.icon

        return (
          <Link
            key={chip.key}
            href={chip.href}
            className={cn(
              'inline-flex items-center gap-2 h-10 min-h-[40px] md:min-h-[40px] px-3',
              'bg-white text-neutral-700 border border-neutral-200 rounded-md',
              'transition-colors duration-fast ease-out',
              c.hover,
              'active:scale-[0.98]',
              // mobile touch target
              'sm:h-10 h-12',
            )}
          >
            <Icon size={16} className={cn('shrink-0', c.icon)} />
            <span className="text-[13px] font-medium">
              {chip.label(count)}
            </span>
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums',
                c.badgeBg,
                c.badgeText,
              )}
            >
              {count > 99 ? '99+' : count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
