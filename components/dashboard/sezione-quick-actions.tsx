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

const TONE: Record<string, { bg: string; iconColor: string; ring: string }> = {
  blue:    { bg: 'bg-blue-50    hover:bg-blue-100',    iconColor: 'text-blue-600',    ring: 'ring-blue-200/60'    },
  emerald: { bg: 'bg-emerald-50 hover:bg-emerald-100', iconColor: 'text-emerald-600', ring: 'ring-emerald-200/60' },
  violet:  { bg: 'bg-violet-50  hover:bg-violet-100',  iconColor: 'text-violet-600',  ring: 'ring-violet-200/60'  },
  orange:  { bg: 'bg-orange-50  hover:bg-orange-100',  iconColor: 'text-orange-600',  ring: 'ring-orange-200/60'  },
  teal:    { bg: 'bg-teal-50    hover:bg-teal-100',    iconColor: 'text-teal-600',    ring: 'ring-teal-200/60'    },
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
    <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-0.5">
      {visible.map((action) => {
        const Icon = action.icon
        const t = TONE[action.tone] ?? TONE.blue
        return (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'group inline-flex items-center gap-2.5 shrink-0 snap-start',
              'h-10 pl-3 pr-4 rounded-xl',
              'ring-1 ring-inset',
              t.bg, t.ring,
              'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
              'hover:-translate-y-[1px] active:scale-[0.98] active:translate-y-0',
            )}
          >
            <Icon size={15} className={cn('shrink-0 transition-transform duration-200 group-hover:scale-110', t.iconColor)} strokeWidth={2.2} />
            <span className="text-[13px] font-semibold text-slate-700 whitespace-nowrap">
              {action.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
