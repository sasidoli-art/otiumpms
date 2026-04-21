'use client'

import Link from 'next/link'
import { Plus, UserCheck, Flower2, Wrench, MessageSquare, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  spaAttivo?: boolean
}

interface QuickAction {
  href: string
  icon: LucideIcon
  label: string
  tone: string
  show?: boolean
}

// Gradient palette con var CSS per compatibilita` dark mode
const TONE: Record<string, { gradient: string; text: string; shadow: string }> = {
  blue:    { gradient: 'from-blue-500 to-blue-600',       text: 'text-blue-600 dark:text-blue-400',     shadow: 'shadow-blue-500/20' },
  emerald: { gradient: 'from-emerald-500 to-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', shadow: 'shadow-emerald-500/20' },
  violet:  { gradient: 'from-violet-500 to-violet-600',   text: 'text-violet-600 dark:text-violet-400', shadow: 'shadow-violet-500/20' },
  orange:  { gradient: 'from-orange-500 to-orange-600',   text: 'text-orange-600 dark:text-orange-400', shadow: 'shadow-orange-500/20' },
  teal:    { gradient: 'from-teal-500 to-teal-600',       text: 'text-teal-600 dark:text-teal-400',     shadow: 'shadow-teal-500/20' },
}

export function SezioneQuickActions({ spaAttivo }: Props) {
  const actions: QuickAction[] = [
    { href: '/host/prenotazioni/nuova',     icon: Plus,          label: 'Prenotazione', tone: 'blue' },
    { href: '/host/oggi',                   icon: UserCheck,     label: 'Check-in',     tone: 'emerald' },
    { href: '/host/spa/appuntamenti?new=1', icon: Flower2,       label: 'Walk-in SPA',  tone: 'violet', show: spaAttivo },
    { href: '/host/manutenzione?new=1',     icon: Wrench,        label: 'Guasto',       tone: 'orange' },
    { href: '/host/staff?new=1',            icon: MessageSquare, label: 'Messaggio',    tone: 'teal' },
  ]

  const visible = actions.filter((a) => a.show !== false)

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
      {visible.map((action) => {
        const Icon = action.icon
        const t = TONE[action.tone] ?? TONE.blue
        return (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'group relative flex flex-col items-center justify-center gap-2 shrink-0 snap-start',
              'w-[88px] md:w-[100px] py-3.5 rounded-2xl',
              'bg-white dark:bg-slate-900',
              'border border-slate-200 dark:border-slate-700',
              'shadow-sm hover:shadow-lg',
              'transition-all duration-200',
              'hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-600',
              'active:scale-95 active:translate-y-0',
            )}
          >
            {/* Icon tile con gradient */}
            <div className={cn(
              'flex items-center justify-center w-11 h-11 rounded-xl',
              'bg-gradient-to-br', t.gradient,
              'shadow-lg', t.shadow,
              'group-hover:shadow-xl group-hover:scale-105',
              'transition-all duration-200',
            )}>
              <Icon size={20} className="text-white" strokeWidth={2.2} />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight">
              {action.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
