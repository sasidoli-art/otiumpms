'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  CreditCard,
  FileText,
  UserCircle,
  LogOut,
  Building2,
  BookOpen,
  Sun,
  TrendingUp,
  Sparkles,
  Users,
  Wrench,
  MessageSquare,
  CalendarPlus,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarRange,
  Package,
  Shield,
  Waves,
  DoorOpen,
  Star,
  CalendarClock,
  Bell,
  Mail,
  Eye,
  ClipboardCheck,
  X,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

const navGroups = [
  {
    label: 'RICEVIMENTO',
    items: [
      { href: '/host/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
      { href: '/host/oggi',        label: 'Front desk',      icon: Sun },
      { href: '/host/strutture',   label: 'Strutture',       icon: Building2 },
    ],
  },
  {
    label: 'PRENOTAZIONI',
    items: [
      { href: '/host/calendario',         label: 'Calendario',    icon: CalendarRange },
      { href: '/host/prenotazioni',       label: 'Prenotazioni', icon: BookOpen },
      { href: '/host/prenotazioni/nuova', label: 'Nuova',         icon: CalendarPlus },
    ],
  },
  {
    label: 'OPERATIVITÀ',
    items: [
      { href: '/host/crm',          label: 'CRM Ospiti',    icon: Users },
      { href: '/host/housekeeping', label: 'Housekeeping',  icon: Sparkles },
      { href: '/host/manutenzione', label: 'Manutenzione',  icon: Wrench },
      { href: '/host/staff',        label: 'Staff',         icon: MessageSquare },
      { href: '/host/alloggiati',   label: 'Alloggiati Web', icon: Shield },
      { href: '/host/promemoria',  label: 'Promemoria',     icon: ClipboardCheck },
    ],
  },
  {
    label: 'BUSINESS',
    items: [
      { href: '/host/pacchetti', label: 'Pacchetti',     icon: Package },
      { href: '/host/eventi',    label: 'I miei eventi', icon: CalendarDays },
      { href: '/host/report',    label: 'Report',        icon: TrendingUp },
      { href: '/host/analytics', label: 'Analytics',     icon: BarChart3 },
      { href: '/host/fatture',   label: 'Fatture',       icon: FileText },
      { href: '/host/email-automatiche', label: 'Email auto', icon: Mail },
    ],
  },
  {
    label: 'SPA & BENESSERE',
    items: [
      { href: '/host/spa',               label: 'Dashboard SPA',  icon: Waves },
      { href: '/host/spa/calendario',    label: 'Calendario',     icon: CalendarClock },
      { href: '/host/spa/appuntamenti',  label: 'Appuntamenti',   icon: CalendarDays },
      { href: '/host/spa/trattamenti',   label: 'Trattamenti',    icon: Sparkles },
      { href: '/host/spa/percorsi',      label: 'Percorsi',       icon: Star },
      { href: '/host/spa/terapisti',     label: 'Terapisti',      icon: Users },
      { href: '/host/spa/cabine',        label: 'Cabine',         icon: DoorOpen },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { href: '/host/notifiche',   label: 'Notifiche',   icon: Bell },
      { href: '/host/abbonamento', label: 'Abbonamento', icon: CreditCard },
      { href: '/host/profilo',     label: 'Profilo',     icon: UserCircle },
    ],
  },
]

export function HostSidebar({
  nomeUtente,
  nomeAzienda,
}: {
  nomeUtente: string
  nomeAzienda: string
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [showLinks, setShowLinks] = useState(false)
  const [strutture, setStrutture] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    if (!showLinks || strutture.length > 0) return
    fetch('/api/host/strutture')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStrutture(data.map((s: { id: string; nome: string }) => ({ id: s.id, nome: s.nome })))
      })
      .catch(() => {})
  }, [showLinks])

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-slate-900 text-white shrink-0 transition-all duration-300 overflow-hidden',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
    >
      {/* ── Logo ──────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-white/10 shrink-0',
          collapsed ? 'justify-center px-0' : 'justify-between px-4'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-base shrink-0 select-none">
            🏨
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-tight">Otium Week</p>
              <p className="text-slate-400 text-[11px] truncate max-w-[120px]">{nomeAzienda}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-slate-500 hover:text-white p-1 rounded transition-colors shrink-0 ml-1"
            title="Comprimi menu"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Section header */}
            {!collapsed ? (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-1 mt-2 first:mt-0">
                {group.label}
              </p>
            ) : (
              <div className="border-t border-white/10 my-2 mx-1" />
            )}

            {group.items.map(({ href, label, icon: Icon }) => {
              // Exact match for "nuova" to avoid activating "prenotazioni" too
              const isActive =
                pathname === href ||
                (href !== '/host/prenotazioni/nuova' &&
                  href !== '/host/prenotazioni' &&
                  pathname.startsWith(href + '/')) ||
                (href === '/host/prenotazioni' &&
                  pathname === '/host/prenotazioni')

              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all group',
                    collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2',
                    isActive
                      ? 'bg-blue-600/15 text-blue-400'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  )}
                >
                  {/* Active left bar */}
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full -ml-2" />
                  )}

                  <Icon size={16} className="shrink-0" />

                  {!collapsed && <span className="flex-1 truncate">{label}</span>}

                  {/* Tooltip for collapsed */}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-white/10">
                      {label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="border-t border-white/10 shrink-0 py-3 px-2">
        {!collapsed && (
          <div className="px-2 py-1 mb-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Accesso come</p>
            <p className="text-xs font-medium text-slate-300 truncate mt-0.5">{nomeUtente}</p>
          </div>
        )}

        <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              title="Espandi menu"
              className="flex items-center justify-center w-10 h-9 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <button
            onClick={() => setShowLinks((v) => !v)}
            title="Anteprima front end"
            className={cn(
              'flex items-center gap-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all',
              collapsed ? 'justify-center w-10 h-9' : 'w-full px-3 py-2'
            )}
          >
            <Eye size={16} className="shrink-0" />
            {!collapsed && <span>Anteprima front end</span>}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Esci"
            className={cn(
              'flex items-center gap-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all',
              collapsed ? 'justify-center w-10 h-9' : 'w-full px-3 py-2'
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Esci</span>}
          </button>
        </div>
      </div>

      {/* ── Pannello link frontend ─────────────────────────── */}
      {showLinks && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLinks(false)} />

          {/* Panel */}
          <div className="relative ml-auto w-80 max-w-full h-full bg-slate-900 border-l border-white/10 overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Eye size={15} />
                <span>Anteprima front end</span>
              </div>
              <button
                onClick={() => setShowLinks(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 px-4 py-4 space-y-5 text-sm">
              {/* Link generici */}
              <section>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Generali</p>
                <div className="space-y-1">
                  {[
                    { label: 'Homepage', href: '/' },
                    { label: 'Pagina prenotazioni', href: '/book' },
                  ].map(({ label, href }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors group"
                    >
                      <span className="truncate">{label}</span>
                      <ExternalLink size={12} className="shrink-0 opacity-50 group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
              </section>

              {/* Link per struttura */}
              {strutture.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-4">Caricamento strutture…</p>
              ) : (
                strutture.map((s) => (
                  <section key={s.id}>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 truncate">
                      {s.nome}
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: 'Prenota', href: `/book/${s.id}` },
                        { label: 'Prenota (SPA)', href: `/book/${s.id}/spa` },
                        { label: 'Prenota (Pacchetti)', href: `/book/${s.id}/pacchetti` },
                      ].map(({ label, href }) => (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors group"
                        >
                          <span className="truncate">{label}</span>
                          <ExternalLink size={12} className="shrink-0 opacity-50 group-hover:opacity-100" />
                        </a>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
