'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Building2, Users, CreditCard, BarChart3,
  Settings, LogOut, Shield, Activity, Globe, FileText, Puzzle, ScrollText, Bot,
  LifeBuoy, Bell, Wifi, PlusCircle, FileSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

export function SuperAdminSidebar({ nomeUtente }: { nomeUtente: string }) {
  const pathname = usePathname()
  const t = useTranslations('nav.superadmin')
  const tc = useTranslations('common')

  const navGroups = useMemo(() => [
    {
      label: null, // solo dashboard, senza header
      items: [
        { href: '/superadmin', label: t('dashboard'), icon: LayoutDashboard },
      ],
    },
    {
      label: 'CLIENTI',
      items: [
        { href: '/superadmin/host',      label: t('hostClients'), icon: Building2 },
        { href: '/superadmin/strutture', label: t('structures'),  icon: Globe },
        { href: '/superadmin/utenti',    label: t('users'),       icon: Users },
      ],
    },
    {
      label: 'COMMERCIALE',
      items: [
        { href: '/superadmin/abbonamenti', label: t('subscriptions'), icon: CreditCard },
        { href: '/superadmin/fatture',     label: t('billing'),       icon: FileText },
        { href: '/superadmin/moduli',      label: t('planModules'),   icon: Puzzle },
      ],
    },
    {
      label: 'SUPPORTO',
      items: [
        { href: '/superadmin/tickets', label: 'Ticket',       icon: LifeBuoy },
      ],
    },
    {
      label: 'WI-FI',
      items: [
        { href: '/superadmin/wifi',          label: t('wifiFleet'),    icon: Wifi },
        { href: '/superadmin/wifi/onboard',  label: t('wifiOnboard'),  icon: PlusCircle },
        { href: '/superadmin/wifi/forensic', label: t('wifiForensic'), icon: FileSearch },
      ],
    },
    {
      label: 'MONITORAGGIO',
      items: [
        { href: '/superadmin/analytics',  label: t('analytics'),  icon: BarChart3 },
        { href: '/superadmin/monitoring', label: t('monitoring'), icon: Activity },
        { href: '/superadmin/audit',      label: 'Audit Log',     icon: ScrollText },
        { href: '/superadmin/compliance', label: 'Compliance',    icon: Shield },
      ],
    },
    {
      label: 'CONFIGURAZIONE',
      items: [
        { href: '/superadmin/impostazioni/ai',          label: 'AI Provider',         icon: Bot },
        { href: '/superadmin/impostazioni/2fa',         label: '2FA / Sicurezza',     icon: Shield },
        { href: '/superadmin/settings/notifiche',       label: 'Notifiche',           icon: Bell },
        { href: '/superadmin/impostazioni',             label: t('settings'),         icon: Settings },
      ],
    },
  ], [t])

  return (
    <aside className="flex flex-col h-full bg-neutral-25 border-r border-neutral-150 w-[220px] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-neutral-150">
        <div className="w-8 h-8 bg-error-100 text-error-700 rounded-md flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        <div className="leading-tight">
          <p className="font-serif text-[15px] text-neutral-900 leading-none">Otium Week</p>
          <p className="text-error-600 text-[10px] font-semibold mt-0.5">{t('superadmin')}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi === 0 ? '' : 'mt-3'}>
            {group.label && (
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-400">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href || (href !== '/superadmin' && pathname.startsWith(href + '/'))
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'group flex items-center gap-2.5 mx-2 my-[1px] px-3 py-[6px] rounded-md text-[13px] transition-colors',
                    isActive
                      ? 'bg-error-50 text-error-700 font-medium'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800'
                  )}
                >
                  <Icon size={16} className={cn('shrink-0 transition-colors',
                    isActive ? 'text-error-600' : 'text-neutral-400 group-hover:text-neutral-600',
                  )} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-150 p-2 space-y-0.5">
        <div className="px-3 py-1.5">
          <p className="text-[10px] text-neutral-400 uppercase tracking-[0.02em]">{tc('loggedInAs')}</p>
          <p className="text-[12px] font-medium text-neutral-800 truncate">{nomeUtente}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-[13px] text-error-600 hover:bg-error-50 transition-colors"
        >
          <LogOut size={16} /> {t('logout')}
        </button>
      </div>
    </aside>
  )
}
