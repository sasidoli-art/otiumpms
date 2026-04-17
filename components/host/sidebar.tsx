'use client'

import { useState, useEffect, useMemo, useCallback, useRef, memo, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, CalendarCheck, Calendar, BookOpen, Users, Globe, Package,
  Sparkles, Wrench, UtensilsCrossed, Boxes, Search,
  Waves, Flower2, CalendarDays, CalendarClock, DoorOpen, Gift, Award, Clock,
  BarChart3, CreditCard, Banknote, FileText,
  MessageSquare, Bell, Mail, Bot, ClipboardCheck,
  Settings, Building2, UserCog, Puzzle, Crown, TrendingUp, Shield, Lock,
  ClipboardList, HelpCircle, LayoutDashboard,
  ChevronRight, PanelLeftClose, PanelLeftOpen, LogOut, X, Eye,
  ExternalLink, MessageCircle, Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseModuli } from '@/lib/moduli'
import { filterSidebarGroups, type SidebarGroup, type SidebarItem, type BadgeType } from '@/lib/sidebar-config'
import { getAllowedSections, type StaffRole } from '@/lib/permissions'
import type { BadgeCounts } from '@/hooks/use-sidebar-badges'

// ─── Icon registry ──────────────────────────────────────────────────────────

const ICONS: Record<string, LucideIcon> = {
  Home, CalendarCheck, Calendar, BookOpen, Users, Globe, Package,
  Sparkles, Wrench, UtensilsCrossed, Boxes, Search,
  Waves, Flower2, CalendarDays, CalendarClock, DoorOpen, Gift, Award, Clock,
  BarChart3, CreditCard, Banknote, FileText,
  MessageSquare, Bell, Mail, Bot, ClipboardCheck,
  Settings, Building2, UserCog, Puzzle, Crown, TrendingUp, Shield, Lock,
  ClipboardList, HelpCircle, LayoutDashboard, MessageCircle, Wallet,
  Cog: Settings,
}

function getIcon(name: string): LucideIcon {
  return ICONS[name] || Settings
}

// ─── i18n label fallback ────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  'sidebar.group.oggi': 'Oggi',
  'sidebar.group.prenotazioniOspiti': 'Prenotazioni & Ospiti',
  'sidebar.group.operazioni': 'Operazioni',
  'sidebar.group.spa': 'SPA & Benessere',
  'sidebar.group.finanze': 'Finanze',
  'sidebar.group.comunicazione': 'Comunicazione',
  'sidebar.group.impostazioni': 'Impostazioni',
  'sidebar.dashboard': 'Dashboard',
  'sidebar.oggi': 'Front desk',
  'sidebar.calendario': 'Calendario',
  'sidebar.prenotazioni': 'Prenotazioni',
  'sidebar.crm': 'CRM Ospiti',
  'sidebar.canali': 'Channel Manager',
  'sidebar.pacchetti': 'Pacchetti',
  'sidebar.housekeeping': 'Housekeeping',
  'sidebar.manutenzione': 'Manutenzione',
  'sidebar.ristorazione': 'Ristorazione',
  'sidebar.magazzino': 'Magazzino',
  'sidebar.oggettiSmarriti': 'Lost & Found',
  'sidebar.spaDashboard': 'Dashboard SPA',
  'sidebar.spaAppuntamenti': 'Appuntamenti',
  'sidebar.spaCalendario': 'Calendario SPA',
  'sidebar.spaTrattamenti': 'Trattamenti',
  'sidebar.spaTerapisti': 'Terapisti',
  'sidebar.spaCabine': 'Cabine',
  'sidebar.spaGiftCard': 'Gift Card',
  'sidebar.spaLoyalty': 'Fedeltà',
  'sidebar.spaWaitingList': 'Waiting List',
  'sidebar.spaReport': 'Report SPA',
  'sidebar.pos': 'POS',
  'sidebar.cassa': 'Cassa / Incassi',
  'sidebar.fatture': 'Fatture',
  'sidebar.reportRevenue': 'Report Revenue',
  'sidebar.staff': 'Bacheca staff',
  'sidebar.notifiche': 'Notifiche',
  'sidebar.emailAuto': 'Email automatiche',
  'sidebar.concierge': 'AI Concierge',
  'sidebar.promemoria': 'Promemoria',
  'sidebar.strutture': 'Strutture',
  'sidebar.utenti': 'Utenti & Staff',
  'sidebar.moduli': 'Moduli attivi',
  'sidebar.abbonamento': 'Abbonamento',
  'sidebar.upselling': 'Upselling',
  'sidebar.alloggiati': 'Alloggiati Web',
  'sidebar.gdpr': 'Privacy & GDPR',
  'sidebar.analytics': 'Analytics',
  'sidebar.audit': 'Registro attività',
  'sidebar.help': 'Help Center',
}

function t(key: string): string {
  return LABELS[key] || key.split('.').pop() || key
}

// ─── Plan badge labels ──────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  LIGHT: 'Light',
  EVENTO_SINGOLO: 'Evento',
  VISIBILITA_MENSILE: 'Pro',
  PARTNER_PREMIUM: 'Premium',
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  nomeUtente: string
  nomeAzienda: string
  moduliAttivi: unknown
  logo?: string | null
  ruolo?: string
  staffRole?: string | null
  piano?: string | null
  hostId?: string | null
  onMobileClose?: () => void
  struttureHost?: { id: string; nome: string }[]
  strutturaAttivaId?: string | null
  badges?: BadgeCounts
}

// ─── localStorage helpers ───────────────────────────────────────────────────

function loadGroupState(hostId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`sidebar-groups-${hostId}`)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveGroupState(hostId: string, state: Record<string, boolean>) {
  try { localStorage.setItem(`sidebar-groups-${hostId}`, JSON.stringify(state)) } catch {}
}

function loadCollapsed(): boolean {
  try { return localStorage.getItem('sidebar-collapsed') === '1' } catch { return false }
}

function saveCollapsed(v: boolean) {
  try { localStorage.setItem('sidebar-collapsed', v ? '1' : '0') } catch {}
}

// ─── Main component ─────────────────────────────────────────────────────────

const EMPTY_BADGES: BadgeCounts = { prenotazioniNuove: 0, arriviOggi: 0, partenzeOggi: 0, taskHKAperti: 0, manutenzioneAperta: 0, messaggiNonLetti: 0, notificheNonLette: 0, spaAppuntamentiOggi: 0, ticketAperti: 0 }

export function HostSidebar({
  nomeUtente, nomeAzienda, moduliAttivi, logo, ruolo = 'HOST',
  staffRole, piano, hostId, onMobileClose,
  struttureHost = [], strutturaAttivaId,
  badges = EMPTY_BADGES,
}: Props) {
  const pathname = usePathname()
  const router = useRouter()

  // ── Derived ──
  const moduli = useMemo(() => parseModuli(moduliAttivi), [moduliAttivi])
  const allowedSections = useMemo(() => getAllowedSections(ruolo, staffRole), [ruolo, staffRole])
  const groups = useMemo(
    () => filterSidebarGroups(moduli, allowedSections, staffRole as StaffRole | null),
    [moduli, allowedSections, staffRole],
  )

  // Separate settings group from rest
  const mainGroups = useMemo(() => groups.filter(g => g.id !== 'impostazioni'), [groups])
  const settingsGroup = useMemo(() => groups.find(g => g.id === 'impostazioni'), [groups])

  // ── State ──
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [strutDropdown, setStrutDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const hid = hostId || 'default'

  // Init from localStorage
  useEffect(() => {
    setCollapsed(loadCollapsed())
    const saved = loadGroupState(hid)
    const initial: Record<string, boolean> = {}
    for (const g of groups) {
      initial[g.id] = saved[g.id] !== undefined ? saved[g.id] : g.defaultOpen
    }
    setOpenGroups(initial)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cmd+K / Ctrl+K is handled by QuickSwitcher in host-layout

  // ── Handlers ──
  const toggleGroup = useCallback((id: string) => {
    setOpenGroups(prev => {
      const next = { ...prev, [id]: !prev[id] }
      saveGroupState(hid, next)
      return next
    })
  }, [hid])

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      saveCollapsed(!prev)
      return !prev
    })
  }, [])

  const cambiaStruttura = useCallback(async (id: string) => {
    if (id === strutturaAttivaId) { setStrutDropdown(false); return }
    await fetch('/api/host/struttura-attiva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strutturaId: id }),
    })
    setStrutDropdown(false)
    router.refresh()
  }, [strutturaAttivaId, router])

  // ── Search filtering ──
  const searchLower = search.toLowerCase().trim()
  const searchResults = useMemo(() => {
    if (!searchLower) return null
    const results: SidebarItem[] = []
    for (const g of groups) {
      for (const item of g.items) {
        const label = t(item.label).toLowerCase()
        if (label.includes(searchLower) || item.id.includes(searchLower)) {
          results.push(item)
        }
      }
    }
    return results
  }, [groups, searchLower])

  // ── Active path check ──
  function isActive(href: string): boolean {
    if (pathname === href) return true
    // Don't match /host/prenotazioni for /host/prenotazioni/nuova
    if (href === '/host/prenotazioni' || href === '/host/spa') return pathname === href
    return pathname.startsWith(href + '/')
  }

  // ── Group has active item ──
  function groupHasActive(group: SidebarGroup): boolean {
    return group.items.some(i => isActive(i.href))
  }

  // Auto-expand group containing active route
  useEffect(() => {
    for (const g of groups) {
      if (groupHasActive(g) && !openGroups[g.id]) {
        setOpenGroups(prev => ({ ...prev, [g.id]: true }))
      }
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const strutturaAttiva = struttureHost.find(s => s.id === strutturaAttivaId) ?? null
  const initials = nomeUtente.split(' ').map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <aside
      className={cn(
        'flex flex-col h-full text-white shrink-0 overflow-hidden',
        'transition-[width] duration-300 ease-in-out',
        'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950',
        collapsed ? 'w-16' : 'w-[260px]',
      )}
    >
      {/* ═══ HEADER: Logo + Plan + Structure ═══════════════════════════════ */}
      <div className={cn(
        'shrink-0 border-b border-white/10',
        collapsed ? 'px-2 py-3' : 'px-4 py-3',
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo */}
          {logo ? (
            <img src={logo} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-white/10" />
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 select-none shadow-lg shadow-brand-500/20">
              {nomeAzienda.charAt(0)}
            </div>
          )}

          {!collapsed && (
            <div className="flex-1 min-w-0">
              {struttureHost.length >= 2 ? (
                <div className="relative">
                  <button
                    onClick={() => setStrutDropdown(v => !v)}
                    className="flex items-center gap-1 text-left min-w-0 hover:opacity-80 transition-opacity w-full"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-sm leading-tight truncate">
                        {strutturaAttiva?.nome ?? 'Seleziona struttura'}
                      </p>
                      <p className="text-slate-400 text-[10px] truncate">
                        {nomeAzienda} · cambia ▾
                      </p>
                    </div>
                  </button>

                  {strutDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setStrutDropdown(false)} />
                      <div className="absolute left-0 top-full mt-2 w-60 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50">
                        <div className="px-3 py-2 border-b border-slate-700">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            Le tue strutture ({struttureHost.length})
                          </p>
                        </div>
                        {struttureHost.map(s => (
                          <button key={s.id} onClick={() => cambiaStruttura(s.id)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center justify-between gap-2">
                            <span className="truncate">{s.nome}</span>
                            {s.id === strutturaAttivaId && <span className="text-emerald-400 text-xs">✓</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm leading-tight truncate">{nomeAzienda}</p>
                  {piano && (
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-brand-500/20 to-brand-600/20 text-brand-300 border border-brand-500/20">
                      {PLAN_LABELS[piano] || piano}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mobile close */}
          {!collapsed && onMobileClose && (
            <button onClick={onMobileClose}
              className="lg:hidden text-slate-500 hover:text-white p-1 rounded transition-colors shrink-0">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ═══ SEARCH ═══════════════════════════════════════════════════════ */}
      {!collapsed && (
        <div className="px-3 py-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-white/[0.06] border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.08] transition-all"
            />
            {!search && (
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 font-mono pointer-events-none hidden lg:block">
                /
              </kbd>
            )}
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ NAVIGATION ═══════════════════════════════════════════════════ */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1 sidebar-scroll" role="navigation" aria-label="Menu principale">
        {/* Search results (flat list) */}
        {searchResults !== null ? (
          <div className="px-2 py-1">
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nessuna pagina trovata</p>
            ) : (
              searchResults.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={isActive(item.href)}
                  badge={item.badge ? badges[item.badge] : undefined}
                  collapsed={false}
                  onNavigate={() => { setSearch(''); onMobileClose?.() }}
                />
              ))
            )}
          </div>
        ) : (
          <>
            {/* Main groups */}
            {mainGroups.map(group => (
              <NavGroup
                key={group.id}
                group={group}
                open={openGroups[group.id] ?? group.defaultOpen}
                onToggle={() => toggleGroup(group.id)}
                collapsed={collapsed}
                pathname={pathname}
                isActive={isActive}
                badges={badges}
                onNavigate={onMobileClose}
              />
            ))}

            {/* Divider before settings */}
            {settingsGroup && (
              <>
                <div className={cn('my-2', collapsed ? 'mx-2' : 'mx-3', 'border-t border-white/10')} />
                <NavGroup
                  group={settingsGroup}
                  open={openGroups[settingsGroup.id] ?? settingsGroup.defaultOpen}
                  onToggle={() => toggleGroup(settingsGroup.id)}
                  collapsed={collapsed}
                  pathname={pathname}
                  isActive={isActive}
                  badges={badges}
                  onNavigate={onMobileClose}
                />
              </>
            )}
          </>
        )}
      </nav>

      {/* ═══ FOOTER: User + collapse ═════════════════════════════════════ */}
      <div className="border-t border-white/10 shrink-0 py-2 px-2">
        {/* User info */}
        {!collapsed ? (
          <div className="px-2 py-1.5 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold shrink-0 select-none ring-2 ring-brand-500/20">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{nomeUtente}</p>
                <p className="text-[10px] text-slate-500 truncate">{ruolo === 'STAFF' && staffRole ? staffRole : ruolo}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1" title={nomeUtente}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold select-none ring-2 ring-brand-500/20">
              {initials}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className={cn('flex gap-0.5', collapsed ? 'flex-col items-center' : 'items-center')}>
          {/* Collapse toggle — desktop only */}
          <button onClick={toggleCollapse} title={collapsed ? 'Espandi' : 'Comprimi'}
            className={cn(
              'hidden lg:flex items-center gap-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all',
              collapsed ? 'justify-center w-10 h-9' : 'px-3 py-2 flex-1',
            )}>
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span className="text-xs">Comprimi</span>}
          </button>

          {/* Logout */}
          <button onClick={() => signOut({ callbackUrl: '/login' })} title="Esci"
            className={cn(
              'flex items-center gap-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all',
              collapsed ? 'justify-center w-10 h-9' : 'px-3 py-2',
            )}>
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span className="text-xs">Esci</span>}
          </button>
        </div>

        {!collapsed && (
          <p className="text-[9px] text-slate-600 text-center mt-1">Powered by OtiumPMS</p>
        )}
      </div>
    </aside>
  )
}

// ─── NavGroup ───────────────────────────────────────────────────────────────

const NavGroup = memo(function NavGroup({
  group, open, onToggle, collapsed, pathname, isActive, badges, onNavigate,
}: {
  group: SidebarGroup
  open: boolean
  onToggle: () => void
  collapsed: boolean
  pathname: string
  isActive: (href: string) => boolean
  badges: BadgeCounts
  onNavigate?: () => void
}) {
  const GroupIcon = getIcon(group.icon)
  const label = t(group.label)

  // Collapsed: icon with flyout
  if (collapsed) {
    return (
      <CollapsedGroup
        icon={<GroupIcon size={16} />}
        label={label}
        items={group.items}
        isActive={isActive}
        badges={badges}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <div className="mb-0.5">
      {/* Group header */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors group"
      >
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronRight size={10} />
        </motion.div>
        <span className="truncate">{label}</span>
      </button>

      {/* Items */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-1">
              {group.items.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={isActive(item.href)}
                  badge={item.badge ? badges[item.badge] : undefined}
                  collapsed={false}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ─── NavItem ────────────────────────────────────────────────────────────────

const NavItem = memo(function NavItem({
  item, active, badge, collapsed, onNavigate,
}: {
  item: SidebarItem
  active: boolean
  badge?: number
  collapsed: boolean
  onNavigate?: () => void
}) {
  const Icon = getIcon(item.icon)
  const label = t(item.label)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all group',
        collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-[7px]',
        active
          ? 'bg-brand-500/15 text-brand-300 border-l-[3px] border-brand-400 shadow-sm shadow-brand-500/5'
          : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200',
      )}
    >
      <Icon size={16} className="shrink-0" />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge != null && badge > 0 && <BadgePill count={badge} type={item.badge} />}
        </>
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-white/10">
          {label}
          {badge != null && badge > 0 && (
            <span className="ml-1.5 text-[10px] font-bold text-blue-400">({badge})</span>
          )}
        </span>
      )}

      {/* Collapsed badge dot */}
      {collapsed && badge != null && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
      )}
    </Link>
  )
})

// ─── Collapsed group flyout ─────────────────────────────────────────────────

function CollapsedGroup({
  icon, label, items, isActive, badges, onNavigate,
}: {
  icon: ReactNode
  label: string
  items: SidebarItem[]
  isActive: (href: string) => boolean
  badges: BadgeCounts
  onNavigate?: () => void
}) {
  const [hover, setHover] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const hasActive = items.some(i => isActive(i.href))

  function enter() { clearTimeout(timerRef.current); setHover(true) }
  function leave() { timerRef.current = setTimeout(() => setHover(false), 200) }

  return (
    <div className="relative mb-0.5" onMouseEnter={enter} onMouseLeave={leave}>
      {/* Group icon */}
      <div className={cn(
        'flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all cursor-pointer',
        hasActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300',
      )}>
        {icon}
      </div>

      {/* Flyout */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-0 ml-2 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50"
            onMouseEnter={enter}
            onMouseLeave={leave}
          >
            <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            {items.map(item => {
              const ItemIcon = getIcon(item.icon)
              const itemLabel = t(item.label)
              const active = isActive(item.href)
              const badge = item.badge ? badges[item.badge] : undefined

              return (
                <Link key={item.id} href={item.href} onClick={() => { setHover(false); onNavigate?.() }}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                    active ? 'text-blue-400 bg-blue-600/10' : 'text-slate-300 hover:bg-slate-700',
                  )}>
                  <ItemIcon size={14} className="shrink-0" />
                  <span className="flex-1 truncate">{itemLabel}</span>
                  {badge != null && badge > 0 && <BadgePill count={badge} type={item.badge} />}
                </Link>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Badge pill ─────────────────────────────────────────────────────────────

function BadgePill({ count, type }: { count: number; type?: BadgeType }) {
  const isUrgent = type === 'manutenzioneAperta'
  const isInfo = type === 'prenotazioniNuove' || type === 'notificheNonLette' || type === 'spaAppuntamentiOggi' || type === 'messaggiNonLetti'

  return (
    <span className={cn(
      'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none',
      isUrgent
        ? 'bg-red-500/20 text-red-400'
        : isInfo
          ? 'bg-blue-500/20 text-blue-400'
          : 'bg-slate-600/50 text-slate-400',
    )}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
