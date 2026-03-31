'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  FileText,
  Settings,
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
import { useState } from 'react'

const adminItems = [
  { href: '/admin/dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/clienti',      label: 'Clienti',        icon: Users },
  { href: '/admin/eventi',       label: 'Eventi',         icon: CalendarDays },
  { href: '/admin/prenotazioni', label: 'Prenotazioni',   icon: BookOpen },
  { href: '/admin/pagamenti',    label: 'Pagamenti',      icon: CreditCard },
  { href: '/admin/fatture',      label: 'Fatture',        icon: FileText },
  { href: '/admin/impostazioni', label: 'Impostazioni',   icon: Settings },
]

const pmsItems = [
  { href: '/host/dashboard',    label: 'Dashboard PMS',  icon: BedDouble },
  { href: '/host/oggi',         label: 'Front desk',     icon: Sun },
  { href: '/host/strutture',    label: 'Strutture',      icon: Building2 },
  { href: '/host/prenotazioni', label: 'Prenotazioni',   icon: BookOpen },
  { href: '/host/crm',          label: 'CRM Ospiti',     icon: Users },
  { href: '/host/housekeeping', label: 'Housekeeping',   icon: Sparkles },
  { href: '/host/manutenzione', label: 'Manutenzione',   icon: Wrench },
  { href: '/host/staff',        label: 'Staff',          icon: MessageSquare },
  { href: '/host/calendario',   label: 'Calendario',     icon: CalendarRange },
  { href: '/host/alloggiati',   label: 'Alloggiati Web', icon: Shield },
  { href: '/host/report',       label: 'Report',         icon: TrendingUp },
]

export function AdminSidebar({ nomeUtente }: { nomeUtente: string }) {
  const pathname = usePathname()
  const [pmsOpen, setPmsOpen] = useState(pathname.startsWith('/host'))

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
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Amministratore</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {/* Admin section */}
        <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Amministrazione
        </p>
        {adminItems.map(({ href, label, icon: Icon }) => renderLink(href, label, Icon))}

        {/* PMS Host collapsible section */}
        <div className="pt-2">
          <button
            onClick={() => setPmsOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-white/60"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <span>PMS Host</span>
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
