'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Building2, Users, CreditCard, BarChart3,
  Settings, LogOut, Shield, Activity, Globe, FileText, Puzzle, ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

export function SuperAdminSidebar({ nomeUtente }: { nomeUtente: string }) {
  const pathname = usePathname()
  const t = useTranslations('nav.superadmin')
  const tc = useTranslations('common')

  const navItems = useMemo(() => [
    { href: '/superadmin',            label: t('dashboard'),      icon: LayoutDashboard },
    { href: '/superadmin/host',       label: t('hostClients'),    icon: Building2 },
    { href: '/superadmin/strutture',  label: t('structures'),     icon: Globe },
    { href: '/superadmin/utenti',     label: t('users'),          icon: Users },
    { href: '/superadmin/abbonamenti',label: t('subscriptions'),  icon: CreditCard },
    { href: '/superadmin/fatture',    label: t('billing'),        icon: FileText },
    { href: '/superadmin/moduli',     label: t('planModules'),    icon: Puzzle },
    { href: '/superadmin/analytics',  label: t('analytics'),      icon: BarChart3 },
    { href: '/superadmin/monitoring', label: t('monitoring'),     icon: Activity },
    { href: '/superadmin/audit',      label: 'Audit Log',         icon: ScrollText },
    { href: '/superadmin/impostazioni', label: t('settings'),     icon: Settings },
  ], [t])

  return (
    <aside className="flex flex-col h-full bg-gray-950 text-white w-[220px] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-white/10">
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-base shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">Otium Week</p>
          <p className="text-red-400 text-[10px] font-semibold">{t('superadmin')}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/superadmin' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 space-y-1">
        <div className="px-2 py-1">
          <p className="text-[10px] text-gray-500">{tc('loggedInAs')}</p>
          <p className="text-xs font-medium text-gray-300 truncate">{nomeUtente}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-gray-100"
        >
          <LogOut size={16} /> {t('logout')}
        </button>
      </div>
    </aside>
  )
}
