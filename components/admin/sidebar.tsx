'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Activity, Building2, CreditCard, Puzzle,
  LifeBuoy, BookOpen, Settings, Mail, ScrollText, Home,
  ChevronDown, LogOut, Shield, Database, UserCog, Rocket, ExternalLink,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ADMIN_SIDEBAR_GROUPS, type AdminBadgeType } from '@/lib/admin-sidebar-config'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, Activity, Building2, CreditCard, Puzzle,
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
    <aside className="flex flex-col h-full w-[240px] shrink-0 bg-neutral-25 border-r border-neutral-150 overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-4 flex items-center gap-2.5 border-b border-neutral-150">
        <div className="w-9 h-9 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
          <Shield className="w-4 h-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="font-serif text-[16px] text-neutral-900 leading-none">Otium Admin</p>
          <p className="text-[11px] text-neutral-500 truncate mt-0.5">{nomeUtente}</p>
        </div>
      </div>

      {/* Groups */}
      <nav className="flex-1 py-2">
        {groups.map((group) => {
          const GroupIcon = ICONS[group.icon] ?? LayoutDashboard
          const isOpen = open[group.id]
          const isRed = group.accent === 'red'
          return (
            <div key={group.id} className="mt-3 first:mt-0">
              <button
                onClick={() => setOpen((p) => ({ ...p, [group.id]: !p[group.id] }))}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] transition-colors',
                  isRed
                    ? 'text-error-500 hover:text-error-700'
                    : 'text-neutral-400 hover:text-neutral-600',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <GroupIcon className="w-3 h-3" />
                  {group.label}
                </span>
                <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen ? '' : '-rotate-90')} />
              </button>
              {isOpen && (
                <div className="py-0.5">
                  {group.items.map((item) => {
                    const Icon = ICONS[item.icon] ?? Home
                    const active = !item.external && (pathname === item.href || pathname.startsWith(item.href + '/'))
                    const badgeCount = item.badge ? badges[item.badge] : undefined

                    const activeClasses = isRed
                      ? 'bg-error-50 text-error-700 font-medium'
                      : 'bg-amber-50 text-amber-700 font-medium'
                    const activeIcon = isRed ? 'text-error-600' : 'text-amber-600'

                    const content = (
                      <>
                        <Icon className={cn('w-4 h-4 shrink-0 transition-colors',
                          active ? activeIcon : 'text-neutral-400 group-hover:text-neutral-600',
                        )} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.external && (
                          <ExternalLink className="w-3 h-3 text-neutral-300 shrink-0" />
                        )}
                        {typeof badgeCount === 'number' && badgeCount > 0 && (
                          <span className={cn(
                            'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums',
                            active ? 'bg-white/70' : 'bg-error-600 text-white',
                          )}>
                            {badgeCount}
                          </span>
                        )}
                      </>
                    )

                    const baseClasses = cn(
                      'group flex items-center gap-2.5 mx-2 my-[1px] px-3 py-[6px] rounded-md text-[13px] transition-colors',
                      active
                        ? activeClasses
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800',
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
      <div className="border-t border-neutral-150 p-2 space-y-0.5">
        <Link
          href="/host/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
        >
          <Building2 className="w-4 h-4 text-neutral-400" />
          Vai al PMS
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-error-600 hover:bg-error-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Esci
        </button>
      </div>
    </aside>
  )
}
