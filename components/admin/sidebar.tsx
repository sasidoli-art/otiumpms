'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  FileText,
  Settings,
  Bug,
  BookOpen,
  Building2,
  CalendarRange,
  TrendingUp,
  Sparkles,
  BedDouble,
  Shield,
  ChevronDown,
  Sun,
  Wrench,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'

export function AdminSidebar({ nomeUtente }: { nomeUtente: string }) {
  const pathname = usePathname()
  const t = useTranslations('nav.admin')
  const tc = useTranslations('common')
  const [pmsOpen, setPmsOpen] = useState(pathname.startsWith('/host'))

  const adminItems = useMemo(() => [
    { href: '/admin/dashboard',    label: t('dashboard'),      icon: LayoutDashboard },
    { href: '/admin/clienti',      label: t('clients'),        icon: Users },
    { href: '/admin/prenotazioni', label: t('bookings'),       icon: BookOpen },
    { href: '/admin/pagamenti',    label: t('payments'),       icon: CreditCard },
    { href: '/admin/fatture',      label: t('invoices'),       icon: FileText },
    { href: '/admin/ticket',      label: t('tickets'),        icon: Bug },
    { href: '/admin/impostazioni', label: t('settings'),       icon: Settings },
  ], [t])

  const pmsItems = useMemo(() => [
    { href: '/host/dashboard',    label: t('dashboardPms'),   icon: BedDouble },
    { href: '/host/oggi',         label: t('frontDesk'),      icon: Sun },
    { href: '/host/strutture',    label: t('structures'),     icon: Building2 },
    { href: '/host/prenotazioni', label: t('bookings'),       icon: BookOpen },
    { href: '/host/crm',          label: t('crmGuests'),      icon: Users },
    { href: '/host/housekeeping', label: t('housekeeping'),   icon: Sparkles },
    { href: '/host/manutenzione', label: t('maintenance'),    icon: Wrench },
    { href: '/host/staff',        label: t('staff'),          icon: MessageSquare },
    { href: '/host/calendario',   label: t('calendar'),       icon: CalendarRange },
    { href: '/host/alloggiati',   label: t('alloggiatiWeb'),  icon: Shield },
    { href: '/host/report',       label: t('report'),         icon: TrendingUp },
  ], [t])

  const initials = nomeUtente
    .split(' ')
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  function renderLink(href: string, label: string, Icon: LucideIcon) {
    const isActive = pathname === href || (pathname.startsWith(href + '/') && href !== '/host/prenotazioni') || (href === '/host/prenotazioni' && pathname === '/host/prenotazioni')
    const iconColor = isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded text-[0.8rem] font-medium transition-colors',
          isActive ? 'text-white' : 'hover:text-white'
        )}
        style={{
          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
          background: isActive ? 'rgba(255,255,255,0.1)' : undefined,
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
      >
        <Icon size={16} className="shrink-0" color={iconColor} />
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <aside
      className="flex flex-col h-full w-[230px] shrink-0 overflow-y-auto"
      style={{ background: '#1a1f2e' }}
    >
      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-white/[0.07]">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm shrink-0">
          🏨
        </div>
        <div className="leading-tight">
          <p className="font-extrabold text-white text-sm">Otium Week</p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Admin Panel</p>
        </div>
      </div>

      {/* User chip */}
      <div className="px-5 pt-3 pb-3 flex items-center gap-2.5 border-b border-white/[0.07]">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="leading-tight min-w-0">
          <p className="text-xs font-semibold text-white truncate">{nomeUtente}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{tc('administrator')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {t('administration')}
        </p>
        {adminItems.map(({ href, label, icon: Icon }) => renderLink(href, label, Icon))}

        <div className="pt-2">
          <button
            onClick={() => setPmsOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-white/60"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <span>{t('pmsHost')}</span>
            <ChevronDown
              size={12}
              className="transition-transform duration-200"
              style={{ transform: pmsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            />
          </button>

          {pmsOpen && (
            <div className="mt-0.5 pl-1 border-l border-white/[0.08] ml-3 space-y-0.5">
              {pmsItems.map(({ href, label, icon: Icon }) => renderLink(href, label, Icon))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
