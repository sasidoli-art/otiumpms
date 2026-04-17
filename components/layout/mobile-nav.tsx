'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, CalendarCheck, MessageSquare, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BadgeCounts } from '@/hooks/use-sidebar-badges'

interface Props {
  onMenuClick: () => void
  badges?: BadgeCounts | null
}

interface TabDef {
  href: string | null
  icon: typeof Home
  label: string
  badgeKey?: keyof BadgeCounts
  center?: boolean
  isMenu?: boolean
}

const TABS: TabDef[] = [
  { href: '/host/dashboard', icon: Home, label: 'Home' },
  { href: '/host/prenotazioni', icon: BookOpen, label: 'Prenota', badgeKey: 'prenotazioniNuove' },
  { href: '/host/oggi', icon: CalendarCheck, label: 'Oggi', center: true, badgeKey: 'arriviOggi' },
  { href: '/host/concierge', icon: MessageSquare, label: 'Messaggi', badgeKey: 'messaggiNonLetti' },
  { href: null, icon: Menu, label: 'Menu', isMenu: true },
]

export function MobileNav({ onMenuClick, badges }: Props) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[var(--bg-elevated)] border-t border-[var(--border-default)] safe-area-bottom">
      <div className="flex items-end justify-around h-14">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = tab.href ? pathname === tab.href || pathname.startsWith(tab.href + '/') : false
          const badgeCount = tab.badgeKey && badges ? badges[tab.badgeKey] ?? 0 : 0
          const isCenter = tab.center

          if ('isMenu' in tab && tab.isMenu) {
            return (
              <button
                key="menu"
                onClick={onMenuClick}
                className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 min-w-[56px] min-h-[44px]"
              >
                <Icon size={20} className="text-[var(--text-tertiary)]" />
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] hidden min-[360px]:block">
                  {tab.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 min-w-[56px] min-h-[44px] transition-colors',
                isCenter && '-mt-2',
              )}
            >
              <div className="relative">
                <Icon
                  size={isCenter ? 24 : 20}
                  className={cn(
                    'transition-all',
                    isActive
                      ? 'text-brand-600 dark:text-brand-400 scale-110'
                      : 'text-[var(--text-tertiary)]',
                  )}
                />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium hidden min-[360px]:block',
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-[var(--text-tertiary)]',
              )}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
