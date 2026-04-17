'use client'

import Link from 'next/link'
import { Plus, BookOpen, UserCheck, Flower2, Wrench, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  spaAttivo?: boolean
}

interface QuickAction {
  href: string
  icon: typeof Plus
  label: string
  color: string
  show?: boolean
}

export function SezioneQuickActions({ spaAttivo }: Props) {
  const actions: QuickAction[] = [
    { href: '/host/prenotazioni/nuova', icon: Plus,          label: '+ Prenotazione', color: 'text-blue-600 dark:text-blue-400' },
    { href: '/host/oggi',               icon: UserCheck,     label: 'Check-in',       color: 'text-emerald-600 dark:text-emerald-400' },
    { href: '/host/spa/appuntamenti?new=1', icon: Flower2,   label: 'Walk-in SPA',    color: 'text-violet-600 dark:text-violet-400', show: spaAttivo },
    { href: '/host/manutenzione?new=1', icon: Wrench,        label: 'Segnala guasto', color: 'text-orange-600 dark:text-orange-400' },
    { href: '/host/staff?new=1',        icon: MessageSquare, label: 'Comunicazione',  color: 'text-teal-600 dark:text-teal-400' },
  ]

  const visible = actions.filter(a => a.show !== false)

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
      {visible.map(action => {
        const Icon = action.icon
        return (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 shrink-0 snap-start',
              'w-16 md:w-20 py-2.5 rounded-xl',
              'border border-slate-200 dark:border-slate-700',
              'hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600',
              'active:scale-95 transition-all',
            )}
          >
            <Icon size={20} className={action.color} />
            <span className="text-[10px] md:text-[11px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">
              {action.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
