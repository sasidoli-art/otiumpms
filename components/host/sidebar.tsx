'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
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
  Banknote,
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
  Puzzle,
  Search,
  UtensilsCrossed,
  Clock,
  Globe,
  Boxes,
  Shirt,
  Code,
  ShoppingBag,
  Award,
  Bot,
  HelpCircle,
  X,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseModuli } from '@/lib/moduli'
import { useState, useEffect, useMemo } from 'react'

// Mapping: href sidebar → id modulo (se non presente = sempre visibile)
const HREF_MODULO: Record<string, string> = {
  '/host/crm': 'crm',
  '/host/housekeeping': 'housekeeping',
  '/host/manutenzione': 'manutenzione',
  '/host/staff': 'staff',
  '/host/alloggiati': 'alloggiati',
  '/host/promemoria': 'promemoria',
  '/host/spa': 'spa',
  '/host/spa/calendario': 'spa',
  '/host/spa/appuntamenti': 'spa',
  '/host/spa/trattamenti': 'spa',
  '/host/spa/percorsi': 'spa',
  '/host/spa/terapisti': 'spa',
  '/host/spa/cabine': 'spa',
  '/host/eventi': 'eventi',
  '/host/fatture': 'fatturazione',
  '/host/pacchetti': 'eventi',
  '/host/email-automatiche': 'emailAuto',
  '/host/ristorazione': 'ristorazione',
  '/host/oggetti-smarriti': 'lostFound',
  '/host/magazzino': 'magazzino',
  '/host/canali': 'channelMgr',
  '/host/servizi': 'catalogo',
  '/host/concierge': 'concierge',
  '/host/upselling': 'upselling',
  '/host/spa/gift-card': 'giftCard',
  '/host/spa/loyalty': 'loyalty',
  '/host/spa/waiting-list': 'waitingList',
  '/host/pos': 'pos',
  '/host/cassa': 'cassa',
}

export function HostSidebar({
  nomeUtente,
  nomeAzienda,
  moduliAttivi,
}: {
  nomeUtente: string
  nomeAzienda: string
  moduliAttivi: unknown
}) {
  const pathname = usePathname()
  const t = useTranslations('nav.host')
  const tp = useTranslations('nav.preview')
  const tc = useTranslations('common')
  const [collapsed, setCollapsed] = useState(false)
  const [showLinks, setShowLinks] = useState(false)
  const [strutture, setStrutture] = useState<{ id: string; nome: string }[]>([])

  const allNavGroups = useMemo(() => [
    {
      label: t('reception'),
      items: [
        { href: '/host/dashboard',   label: t('dashboard'),       icon: LayoutDashboard },
        { href: '/host/oggi',        label: t('frontDesk'),       icon: Sun },
        { href: '/host/strutture',   label: t('structures'),      icon: Building2 },
      ],
    },
    {
      label: t('reservations'),
      items: [
        { href: '/host/calendario',         label: t('calendar'),    icon: CalendarRange },
        { href: '/host/prenotazioni',       label: t('bookings'),    icon: BookOpen },
        { href: '/host/prenotazioni/nuova', label: t('newBooking'),  icon: CalendarPlus },
      ],
    },
    {
      label: t('operations'),
      items: [
        { href: '/host/crm',          label: t('crmGuests'),    icon: Users },
        { href: '/host/housekeeping', label: t('housekeeping'),  icon: Sparkles },
        { href: '/host/housekeeping/biancheria', label: t('linens'), icon: Shirt },
        { href: '/host/oggetti-smarriti',  label: t('lostFound'),  icon: Search },
        { href: '/host/magazzino',    label: t('warehouse'),     icon: Boxes },
        { href: '/host/manutenzione', label: t('maintenance'),   icon: Wrench },
        { href: '/host/staff',        label: t('staff'),         icon: MessageSquare },
        { href: '/host/alloggiati',   label: t('alloggiatiWeb'), icon: Shield },
        { href: '/host/promemoria',   label: t('reminders'),     icon: ClipboardCheck },
        { href: '/host/ristorazione', label: t('catering'),      icon: UtensilsCrossed },
      ],
    },
    {
      label: t('business'),
      items: [
        { href: '/host/pacchetti', label: t('packages'),     icon: Package },
        { href: '/host/eventi',    label: t('myEvents'),     icon: CalendarDays },
        { href: '/host/cassa',     label: t('cashRegister'),  icon: Banknote },
        { href: '/host/report',    label: t('report'),       icon: TrendingUp },
        { href: '/host/analytics', label: t('analytics'),    icon: BarChart3 },
        { href: '/host/fatture',   label: t('invoices'),     icon: FileText },
        { href: '/host/email-automatiche', label: t('autoEmail'), icon: Mail },
        { href: '/host/canali',           label: t('channelManager'), icon: Globe },
        { href: '/host/servizi',           label: t('serviceCatalog'), icon: ShoppingBag },
        { href: '/host/upselling',        label: t('upselling'),        icon: Award },
        { href: '/host/concierge',        label: t('aiConcierge'),     icon: Bot },
        { href: '/host/integrazione',     label: t('siteIntegration'), icon: Code },
      ],
    },
    {
      label: t('spaWellness'),
      items: [
        { href: '/host/spa',               label: t('spaDashboard'),  icon: Waves },
        { href: '/host/spa/calendario',    label: t('spaCalendar'),   icon: CalendarClock },
        { href: '/host/spa/appuntamenti',  label: t('spaAppointments'), icon: CalendarDays },
        { href: '/host/spa/trattamenti',   label: t('spaTreatments'), icon: Sparkles },
        { href: '/host/spa/percorsi',      label: t('spaPaths'),      icon: Star },
        { href: '/host/spa/terapisti',     label: t('spaTherapists'), icon: Users },
        { href: '/host/spa/cabine',        label: t('spaRooms'),      icon: DoorOpen },
        { href: '/host/spa/gift-card',     label: 'Gift Card',        icon: CreditCard },
        { href: '/host/spa/loyalty',       label: 'Fedeltà',         icon: Award },
        { href: '/host/spa/waiting-list',  label: 'Waiting List',     icon: Clock },
        { href: '/host/pos',              label: 'POS',              icon: ShoppingBag },
      ],
    },
    {
      label: t('account'),
      items: [
        { href: '/host/notifiche',   label: t('notifications'),   icon: Bell },
        { href: '/host/gdpr',        label: t('gdprPrivacy'), icon: Shield },
        { href: '/host/audit',       label: t('activityLog'),     icon: Clock },
        { href: '/host/moduli',      label: t('modules'),       icon: Puzzle },
        { href: '/host/abbonamento', label: t('subscription'), icon: CreditCard },
        { href: '/host/utenti',      label: t('users') ?? 'Utenti', icon: Users },
        { href: '/host/profilo',     label: t('profile'),     icon: UserCircle },
        { href: '/host/help',        label: t('help'),        icon: HelpCircle },
      ],
    },
  ], [t])

  // Filtra i gruppi sidebar in base ai moduli attivi
  const moduli = useMemo(() => parseModuli(moduliAttivi), [moduliAttivi])
  const navGroups = useMemo(() => {
    return allNavGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          const moduloId = HREF_MODULO[item.href]
          if (!moduloId) return true
          return moduli[moduloId] === true
        }),
      }))
      .filter(group => group.items.length > 0)
  }, [moduli, allNavGroups])

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
            title={t('collapseMenu')}
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed ? (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-1 mt-2 first:mt-0">
                {group.label}
              </p>
            ) : (
              <div className="border-t border-white/10 my-2 mx-1" />
            )}

            {group.items.map(({ href, label, icon: Icon }) => {
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
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full -ml-2" />
                  )}
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{label}</span>}
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
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{tc('loggedInAs')}</p>
            <p className="text-xs font-medium text-slate-300 truncate mt-0.5">{nomeUtente}</p>
          </div>
        )}

        <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              title={t('expandMenu')}
              className="flex items-center justify-center w-10 h-9 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <button
            onClick={() => setShowLinks((v) => !v)}
            title={t('frontendPreview')}
            className={cn(
              'flex items-center gap-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all',
              collapsed ? 'justify-center w-10 h-9' : 'w-full px-3 py-2'
            )}
          >
            <Eye size={16} className="shrink-0" />
            {!collapsed && <span>{t('frontendPreview')}</span>}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title={t('logout')}
            className={cn(
              'flex items-center gap-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all',
              collapsed ? 'justify-center w-10 h-9' : 'w-full px-3 py-2'
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>{t('logout')}</span>}
          </button>
        </div>
      </div>

      {/* ── Pannello link frontend ─────────────────────────── */}
      {showLinks && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLinks(false)} />
          <div className="relative ml-auto w-80 max-w-full h-full bg-slate-900 border-l border-white/10 overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Eye size={15} />
                <span>{t('frontendPreview')}</span>
              </div>
              <button
                onClick={() => setShowLinks(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 px-4 py-4 space-y-5 text-sm">
              <section>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{tp('general')}</p>
                <div className="space-y-1">
                  {[
                    { label: tp('homepage'), href: '/' },
                    { label: tp('bookingsPage'), href: '/book' },
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

              {strutture.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-4">{tp('loadingStructures')}</p>
              ) : (
                strutture.map((s) => (
                  <section key={s.id}>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 truncate">
                      {s.nome}
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: tp('book'), href: `/book/${s.id}` },
                        { label: tp('bookSpa'), href: `/book/${s.id}/spa` },
                        { label: tp('bookPackages'), href: `/book/${s.id}/pacchetti` },
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
