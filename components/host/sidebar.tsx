'use client'

import { useState, useEffect, useMemo, useCallback, useRef, memo, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, CalendarCheck, Calendar, BookOpen, Globe, Package,
  Sparkles, Wrench, UtensilsCrossed, Boxes, Search,
  Waves, Flower2, CalendarDays, CalendarClock, DoorOpen, Gift, Award, Clock,
  BarChart3, CreditCard, Banknote, FileText,
  MessageSquare, Bell, Mail, Bot, ClipboardCheck,
  Settings, Building2, UserCog, Puzzle, Crown, TrendingUp, Shield, Lock,
  ClipboardList, HelpCircle, LayoutDashboard,
  ChevronRight, PanelLeftClose, PanelLeftOpen, LogOut, X,
  MessageCircle, Wallet, User,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseModuli } from '@/lib/moduli'
import { filterSidebarGroups, type SidebarGroup, type SidebarItem, type BadgeType } from '@/lib/sidebar-config'
import { getAllowedSections, type StaffRole } from '@/lib/permissions'
import type { BadgeCounts } from '@/hooks/use-sidebar-badges'
import { ThemeToggle } from '@/components/ui/theme-toggle'

// ─── Icon registry ──────────────────────────────────────────────────────────

const ICONS: Record<string, LucideIcon> = {
  Home, CalendarCheck, Calendar, BookOpen, Globe, Package,
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
  'sidebar.wifi': 'Wi-Fi Ospiti',
  'sidebar.guida': 'Guida in camera',
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

  const mainGroups = useMemo(() => groups.filter(g => g.id !== 'impostazioni'), [groups])
  const settingsGroup = useMemo(() => groups.find(g => g.id === 'impostazioni'), [groups])

  // ── State ──
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [strutDropdown, setStrutDropdown] = useState(false)
  const [userDropdown, setUserDropdown] = useState(false)
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

  // ⌘K / Ctrl+K shortcut → focus search (compatibile con QuickSwitcher globale)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
    if (href === '/host/prenotazioni' || href === '/host/spa') return pathname === href
    return pathname.startsWith(href + '/')
  }

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
  const planLabel = piano ? PLAN_LABELS[piano] ?? piano : null

  // Label opacity choreography:
  //   collapse → labels fade out (100ms) first, THEN width shrinks (handled da
  //   CSS su aside: transitions sono staggered tramite delay)
  //   expand   → width grows first, THEN labels fade in (delay 200ms)
  const labelTransition = collapsed
    ? 'opacity-0 duration-100 delay-0'
    : 'opacity-100 duration-100 delay-200'

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full shrink-0 overflow-hidden',
        'bg-neutral-25 border-r border-neutral-150',
        'transition-[width] ease-in-out',
        collapsed ? 'w-16 duration-slow' : 'w-64 duration-slow',
      )}
    >
      {/* ═══ HEADER: Logo + Azienda + Plan ══════════════════════════════════ */}
      <div className={cn(
        'shrink-0 border-b border-neutral-150',
        collapsed ? 'px-2 py-3' : 'px-5 py-4',
      )}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo o iniziale azienda */}
          {logo ? (
            <img
              src={logo}
              alt=""
              className={cn(
                'shrink-0 object-contain',
                collapsed ? 'h-7 w-7' : 'h-8 max-w-[140px]',
              )}
            />
          ) : (
            <div className={cn(
              'shrink-0 flex items-center justify-center font-bold select-none',
              'bg-primary-100 text-primary-700 rounded-md',
              collapsed ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm',
            )}>
              {nomeAzienda.charAt(0)}
            </div>
          )}

          {/* Nome azienda + plan (nascosto in collapsed) */}
          <div className={cn(
            'flex-1 min-w-0 transition-opacity',
            labelTransition,
            collapsed && 'pointer-events-none',
          )}>
            {struttureHost.length >= 2 ? (
              <div className="relative">
                <button
                  onClick={() => setStrutDropdown(v => !v)}
                  className="text-left min-w-0 w-full hover:opacity-70 transition-opacity"
                >
                  <p className="font-serif text-[16px] leading-tight text-neutral-900 truncate">
                    {strutturaAttiva?.nome ?? 'Seleziona struttura'}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {nomeAzienda} · cambia
                  </p>
                </button>

                {strutDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setStrutDropdown(false)} />
                    <div className="absolute left-0 top-full mt-2 w-60 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
                      <div className="px-3 py-1.5 border-b border-neutral-100">
                        <p className="text-[10px] uppercase tracking-[0.02em] text-neutral-400 font-semibold">
                          Strutture ({struttureHost.length})
                        </p>
                      </div>
                      {struttureHost.map(s => (
                        <button key={s.id} onClick={() => cambiaStruttura(s.id)}
                          className="w-full text-left px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-100 flex items-center justify-between gap-2">
                          <span className="truncate">{s.nome}</span>
                          {s.id === strutturaAttivaId && <span className="text-primary-600 text-xs">✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <p className="font-serif text-[16px] leading-tight text-neutral-900 truncate">
                  {nomeAzienda}
                </p>
                {planLabel && (
                  <span className="inline-block mt-1 px-1.5 py-[1px] text-[10px] font-semibold bg-primary-50 text-primary-600 rounded-sm">
                    {planLabel}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Mobile close */}
          {!collapsed && onMobileClose && (
            <button onClick={onMobileClose}
              className="lg:hidden text-neutral-400 hover:text-neutral-700 p-1 rounded transition-colors shrink-0">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ═══ SEARCH ═══════════════════════════════════════════════════════ */}
      {!collapsed && (
        <div className={cn('shrink-0 px-3 py-2 transition-opacity', labelTransition)}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca..."
              className={cn(
                'w-full h-8 pl-8 pr-10 text-[13px]',
                'bg-neutral-100 text-neutral-800 placeholder:text-neutral-400',
                'border border-transparent rounded-full',
                'focus:outline-none focus:bg-white focus:border-primary-300 focus:shadow-xs',
                'transition-[background-color,border-color,box-shadow] duration-fast ease-out',
              )}
            />
            {!search ? (
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-400 bg-white border border-neutral-200 rounded px-1.5 py-0.5 pointer-events-none hidden lg:block">
                ⌘K
              </kbd>
            ) : (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ NAVIGATION ═══════════════════════════════════════════════════ */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1 sidebar-scroll" role="navigation" aria-label="Menu principale">
        {searchResults !== null ? (
          <div className="px-2 py-1">
            {searchResults.length === 0 ? (
              <p className="text-[12px] text-neutral-400 text-center py-6">Nessuna pagina trovata</p>
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
            {mainGroups.map((group, idx) => (
              <NavGroup
                key={group.id}
                group={group}
                open={openGroups[group.id] ?? group.defaultOpen}
                onToggle={() => toggleGroup(group.id)}
                collapsed={collapsed}
                labelTransition={labelTransition}
                pathname={pathname}
                isActive={isActive}
                badges={badges}
                onNavigate={onMobileClose}
                isFirst={idx === 0}
              />
            ))}

            {settingsGroup && (
              <>
                <div className={cn('my-2 mx-3 border-t border-neutral-150')} />
                <NavGroup
                  group={settingsGroup}
                  open={openGroups[settingsGroup.id] ?? settingsGroup.defaultOpen}
                  onToggle={() => toggleGroup(settingsGroup.id)}
                  collapsed={collapsed}
                  labelTransition={labelTransition}
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
      <div className="border-t border-neutral-150 shrink-0 p-2">
        {/* User avatar + menu */}
        <div className="relative">
          <button
            onClick={() => setUserDropdown(v => !v)}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-md transition-colors',
              'hover:bg-neutral-100',
              collapsed ? 'justify-center p-1.5' : 'p-1.5',
            )}
            aria-haspopup="menu"
            aria-expanded={userDropdown}
          >
            <div className={cn(
              'rounded-full flex items-center justify-center font-semibold select-none shrink-0',
              'bg-primary-100 text-primary-700',
              collapsed ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-[12px]',
            )}>
              {initials}
            </div>
            <div className={cn(
              'flex-1 min-w-0 text-left transition-opacity',
              labelTransition,
              collapsed && 'hidden',
            )}>
              <p className="text-[13px] font-medium text-neutral-800 truncate leading-tight">{nomeUtente}</p>
              <p className="text-[11px] text-neutral-400 truncate">
                {ruolo === 'STAFF' && staffRole ? staffRole : ruolo}
              </p>
            </div>
          </button>

          {userDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserDropdown(false)} />
              <div className={cn(
                'absolute bottom-full mb-2 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg py-1',
                collapsed ? 'left-full ml-2 w-44' : 'left-0 right-0',
              )}>
                <Link
                  href="/host/profilo"
                  onClick={() => setUserDropdown(false)}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <User size={14} className="text-neutral-400" />
                  Profilo
                </Link>
                <div className="my-1 border-t border-neutral-100" />
                <button
                  onClick={() => { setUserDropdown(false); signOut({ callbackUrl: '/login' }) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <LogOut size={14} className="text-neutral-400" />
                  Esci
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer actions: theme toggle + collapse */}
        <div className={cn(
          'mt-1 flex items-center gap-1',
          collapsed ? 'flex-col' : 'flex-row',
        )}>
          <ThemeToggle size="sm" />

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleCollapse}
            title={collapsed ? 'Espandi' : 'Comprimi'}
            className={cn(
              'hidden lg:flex items-center gap-2 rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors',
              'dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
              collapsed ? 'justify-center w-8 h-8' : 'flex-1 px-2 py-1.5',
            )}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            <span className={cn('text-[12px] font-medium transition-opacity', labelTransition, collapsed && 'hidden')}>
              Comprimi
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── NavGroup ───────────────────────────────────────────────────────────────

const NavGroup = memo(function NavGroup({
  group, open, onToggle, collapsed, labelTransition, pathname, isActive, badges, onNavigate, isFirst,
}: {
  group: SidebarGroup
  open: boolean
  onToggle: () => void
  collapsed: boolean
  labelTransition: string
  pathname: string
  isActive: (href: string) => boolean
  badges: BadgeCounts
  onNavigate?: () => void
  isFirst?: boolean
}) {
  const GroupIcon = getIcon(group.icon)
  const label = t(group.label)

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
    <div className={cn(isFirst ? '' : 'mt-4')}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'w-full flex items-center gap-1.5 px-4 py-2 group transition-colors',
          'text-[11px] font-semibold uppercase tracking-[0.02em] text-neutral-400 hover:text-neutral-600',
        )}
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0 inline-flex"
        >
          <ChevronRight size={12} />
        </motion.span>
        <span className={cn('truncate transition-opacity', labelTransition)}>{label}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="py-0.5">
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
        'group relative flex items-center rounded-md transition-colors duration-fast ease-out',
        collapsed
          ? 'justify-center w-10 h-10 mx-auto my-[1px]'
          : 'gap-2.5 mx-2 my-[1px] px-3 py-[6px]',
        // Stato default
        !active && 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800',
        // Stato attivo (no border-left — solo bg)
        active && 'bg-primary-50 text-primary-700 font-medium',
      )}
    >
      <Icon
        size={16}
        className={cn(
          'shrink-0 transition-colors',
          !active && 'text-neutral-400 group-hover:text-neutral-600',
          active && 'text-primary-600',
        )}
      />

      {!collapsed && (
        <>
          <span className="flex-1 truncate text-[13px]">{label}</span>
          {badge != null && badge > 0 && <SidebarBadge count={badge} type={item.badge} />}
        </>
      )}

      {/* Tooltip (collapsed only) */}
      {collapsed && (
        <span
          role="tooltip"
          className={cn(
            'absolute left-full ml-3 px-2.5 py-1.5 text-[12px] whitespace-nowrap rounded-md shadow-lg z-50 pointer-events-none',
            'bg-neutral-800 text-white',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-[200ms]',
          )}
        >
          {label}
          {badge != null && badge > 0 && (
            <span className="ml-1.5 text-[10px] font-bold text-primary-300">({badge})</span>
          )}
        </span>
      )}

      {/* Collapsed badge dot */}
      {collapsed && badge != null && badge > 0 && (
        <span
          aria-label={`${badge} elementi`}
          className={cn(
            'absolute top-1 right-1 w-2 h-2 rounded-full',
            item.badge === 'manutenzioneAperta' ? 'bg-error-500' : 'bg-primary-500',
          )}
        />
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
    <div className="relative my-1" onMouseEnter={enter} onMouseLeave={leave}>
      <div className={cn(
        'flex items-center justify-center w-10 h-10 mx-auto rounded-md transition-colors cursor-default',
        hasActive
          ? 'bg-primary-50 text-primary-600'
          : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600',
      )}>
        {icon}
      </div>

      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-0 ml-2 w-52 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50"
            onMouseEnter={enter}
            onMouseLeave={leave}
          >
            <p className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.02em]">{label}</p>
            {items.map(item => {
              const ItemIcon = getIcon(item.icon)
              const itemLabel = t(item.label)
              const active = isActive(item.href)
              const badge = item.badge ? badges[item.badge] : undefined

              return (
                <Link key={item.id} href={item.href} onClick={() => { setHover(false); onNavigate?.() }}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-[7px] text-[13px] transition-colors',
                    active ? 'text-primary-700 bg-primary-50 font-medium' : 'text-neutral-700 hover:bg-neutral-100',
                  )}>
                  <ItemIcon size={14} className={cn('shrink-0', active ? 'text-primary-600' : 'text-neutral-400')} />
                  <span className="flex-1 truncate">{itemLabel}</span>
                  {badge != null && badge > 0 && <SidebarBadge count={badge} type={item.badge} />}
                </Link>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sidebar badge counter ─────────────────────────────────────────────────

function SidebarBadge({ count, type }: { count: number; type?: BadgeType }) {
  const isUrgent = type === 'manutenzioneAperta'
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none tabular-nums',
        'transition-all',
        isUrgent
          ? 'bg-error-600 text-white'
          : 'bg-primary-600 text-white',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
