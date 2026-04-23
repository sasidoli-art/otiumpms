'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Activity, Users, Building2, CreditCard, Puzzle,
  LifeBuoy, BookOpen, Settings, Mail, ScrollText, Home,
  ChevronDown, LogOut, Shield, Database, UserCog, Rocket, ExternalLink,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ADMIN_SIDEBAR_GROUPS, type AdminBadgeType } from '@/lib/admin-sidebar-config'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, Activity, Users, Building2, CreditCard, Puzzle,
  LifeBuoy, BookOpen, Settings, Mail, ScrollText, Home,
  Shield, Database, UserCog, Rocket,
}

interface Props {
  nomeUtente: string
  userRole?: string
}

export function AdminSidebar({ nomeUtente, userRole }: Props) {
  const pathname = usePathname()

  const groups = useMemo(
    () => ADMIN_SIDEBAR_GROUPS.filter((g) => !g.superadminOnly || userRole === 'SUPERADMIN'),
    [userRole],
  )

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    ADMIN_SIDEBAR_GROUPS.forEach((g) => { init[g.id] = g.defaultOpen })
    return init
  })
  const [badges, setBadges] = useState<Partial<Record<AdminBadgeType, number>>>({})

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setBadges({
          ticketAperti: d?.azioniRichieste?.ticketAperti ?? 0,
          hostTrialScadenza: d?.azioniRichieste?.abbonamentiInScadenza ?? 0,
        })
      })
      .catch(() => {})
  }, [])

  return (
    <aside className="flex flex-col h-full w-[240px] shrink-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-4 flex items-center gap-2.5 border-b border-white/[0.07]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
          <Shield className="w-4 h-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="font-extrabold text-white text-sm">Otium Admin</p>
          <p className="text-[11px] text-amber-300/70 truncate">{nomeUtente}</p>
        </div>
      </div>

      {/* Groups */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {groups.map((group) => {
          const GroupIcon = ICONS[group.icon] ?? LayoutDashboard
          const isOpen = open[group.id]
          const isRed = group.accent === 'red'
          return (
            <div key={group.id}>
              <button
                onClick={() => setOpen((p) => ({ ...p, [group.id]: !p[group.id] }))}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                  isRed
                    ? 'text-red-400/80 hover:text-red-300'
                    : 'text-white/40 hover:text-white/70',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <GroupIcon className="w-3 h-3" />
                  {group.label}
                </span>
                <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen ? '' : '-rotate-90')} />
              </button>
              {isOpen && (
                <div className="space-y-0.5 mt-1 mb-2">
                  {group.items.map((item) => {
                    const Icon = ICONS[item.icon] ?? Home
                    const active = !item.external && (pathname === item.href || pathname.startsWith(item.href + '/'))
                    const badgeCount = item.badge ? badges[item.badge] : undefined

                    const activeClasses = isRed
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'

                    const content = (
                      <>
                        <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-white/40')} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.external && (
                          <ExternalLink className="w-3 h-3 text-white/30 shrink-0" />
                        )}
                        {typeof badgeCount === 'number' && badgeCount > 0 && (
                          <span className={cn(
                            'inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-bold',
                            active ? 'bg-white/25 text-white' : 'bg-red-500 text-white',
                          )}>
                            {badgeCount}
                          </span>
                        )}
                      </>
                    )

                    const baseClasses = cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      active
                        ? activeClasses
                        : 'text-white/60 hover:text-white hover:bg-white/5',
                    )

                    if (item.external) {
                      return (
                        <a
                          key={item.id}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={baseClasses}
                        >
                          {content}
                        </a>
                      )
                    }

                    return (
                      <Link key={item.id} href={item.href} className={baseClasses}>
                        {content}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.07] p-3 space-y-1">
        <Link
          href="/host/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Building2 className="w-4 h-4" />
          Vai al PMS
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Esci
        </button>
      </div>
    </aside>
  )
}
