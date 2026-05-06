'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Menu, Plus, ChevronRight, LogOut, User, Settings,
  MessageSquare, Moon, Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SIDEBAR_GROUPS } from '@/lib/sidebar-config'
import type { BadgeCounts } from '@/hooks/use-sidebar-badges'
import { NotificheBell } from '@/components/layout/notifiche-bell'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { StrutturaSwitcher } from '@/components/layout/struttura-switcher'
import { ConciergeToggle } from '@/components/layout/concierge-toggle'
import { useTheme } from '@/components/theme-provider'

// ─── Breadcrumb path → label mapping ────────────────────────────────────────

const PATH_LABELS: Record<string, string> = {}
for (const group of SIDEBAR_GROUPS) {
  for (const item of group.items) {
    PATH_LABELS[item.href] = item.label
  }
}

// Extra labels not in sidebar config
const EXTRA_LABELS: Record<string, string> = {
  '/host/prenotazioni/nuova': 'Nuova prenotazione',
  '/host/profilo': 'Profilo',
  '/host/impostazioni-regcard': 'Registration Card',
  '/host/integrazione': 'Widget & Integrazioni',
  '/host/onboarding': 'Onboarding',
  '/host/seleziona-struttura': 'Seleziona struttura',
  '/host/ristorazione/menu': 'Menu & Piatti',
  '/host/housekeeping/biancheria': 'Biancheria',
  '/host/concierge/impostazioni': 'Impostazioni Concierge',
  '/host/concierge/test': 'Simulatore Concierge',
  '/host/spa/percorsi': 'Percorsi benessere',
}

// i18n label fallback (same map as sidebar.tsx — TODO: centralize)
const I18N_LABELS: Record<string, string> = {
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

function resolveLabel(i18nKey: string): string {
  return I18N_LABELS[i18nKey] || i18nKey.split('.').pop() || i18nKey
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  nomeUtente: string
  email?: string | null
  ruolo: string
  onMenuClick?: () => void
  strutture?: { id: string; nome: string }[]
  strutturaAttivaId?: string | null
  badges?: BadgeCounts | null
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Topbar({
  nomeUtente, email, ruolo, onMenuClick,
  strutture, strutturaAttivaId, badges,
}: Props) {
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  // Shadow on scroll
  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    function onScroll() {
      setScrolled(main!.scrollTop > 10)
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Breadcrumb ──
  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname])

  // ── Unread message count (for chat icon badge) ──
  const unreadMessages = badges?.messaggiNonLetti ?? 0

  const chatHref = ruolo === 'STAFF' ? '/host/staff' : '/host/concierge'

  const initials = nomeUtente
    .split(' ')
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  const roleLabel = ROLE_LABELS[ruolo] || ruolo

  return (
    <div className={cn(
      'bg-[var(--bg-elevated)] border-b border-[var(--border-default)]',
      'h-14 flex items-center px-3 md:px-5 shrink-0 sticky top-0 z-30',
      'transition-shadow duration-200',
      scrolled && 'shadow-[var(--shadow-sm)]',
    )}>
      {/* Left — hamburger + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Hamburger — mobile only */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Breadcrumb */}
        <nav className="hidden sm:flex items-center gap-1 min-w-0 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <span key={crumb.href} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                {isLast ? (
                  <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 truncate transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            )
          })}
        </nav>

        {/* Mobile: show only current page name */}
        <span className="sm:hidden text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
          {breadcrumbs[breadcrumbs.length - 1]?.label}
        </span>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {/* + Nuova prenotazione */}
        <Link
          href="/host/prenotazioni/nuova"
          className={cn(
            'flex items-center gap-1.5 rounded-lg font-semibold',
            'bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-700 hover:to-brand-800',
            'shadow-sm shadow-brand-600/20 hover:shadow-md hover:shadow-brand-600/25',
            'px-2.5 py-1.5 md:px-3.5 md:py-2 text-xs',
          )}
        >
          <Plus size={14} className="shrink-0" />
          <span className="hidden md:inline">Nuova prenotazione</span>
        </Link>

        {/* Chat / messages */}
        <Link
          href={chatHref}
          className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          title="Messaggi"
        >
          <MessageSquare size={18} />
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-0.5">
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </Link>

        {/* Notifications bell (self-contained, fetches its own data) */}
        <NotificheBell />

        {/* AI Concierge toggle */}
        {ruolo === 'HOST' && <ConciergeToggle />}

        {/* Structure switcher */}
        {strutture && strutture.length >= 2 && (
          <div className="hidden md:block">
            <StrutturaSwitcher strutture={strutture} attivaId={strutturaAttivaId ?? null} />
          </div>
        )}

        {/* Language switcher */}
        <LanguageSwitcher className="hidden md:block" />

        {/* Dark mode */}
        <ThemeToggle />

        {/* User avatar + dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-bold select-none shrink-0 ring-2 ring-brand-500/10">
              {initials || <User size={14} />}
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-11 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 py-1 z-50">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{nomeUtente}</p>
                {email && <p className="text-[11px] text-slate-400 truncate mt-0.5">{email}</p>}
                <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                  {roleLabel}
                </span>
              </div>

              {/* Menu items */}
              <Link
                href="/host/profilo"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings size={14} className="text-slate-400" />
                Profilo & Impostazioni
              </Link>

              <div className="border-t border-slate-100 dark:border-slate-700 mt-1" />

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <LogOut size={14} className="text-slate-400" />
                Esci
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Breadcrumb builder ─────────────────────────────────────────────────────

interface Crumb {
  label: string
  href: string
}

function buildBreadcrumbs(pathname: string): Crumb[] {
  // Try exact match first
  const exactLabel = PATH_LABELS[pathname] || EXTRA_LABELS[pathname]
  if (exactLabel) {
    return [{ label: resolveLabel(exactLabel), href: pathname }]
  }

  // Try parent + detail pattern: /host/prenotazioni/[id] → ["Prenotazioni", "Dettaglio"]
  // Split path and try to find a parent match
  const segments = pathname.split('/').filter(Boolean) // ["host", "prenotazioni", "abc123"]
  if (segments.length < 2) return [{ label: 'Dashboard', href: '/host/dashboard' }]

  // Build potential parent paths from longest to shortest
  const crumbs: Crumb[] = []

  // Try 2-segment parent: /host/prenotazioni
  const parentPath2 = '/' + segments.slice(0, 2).join('/')
  const parentLabel2 = PATH_LABELS[parentPath2] || EXTRA_LABELS[parentPath2]

  // Try 3-segment parent: /host/spa/trattamenti
  const parentPath3 = segments.length >= 3 ? '/' + segments.slice(0, 3).join('/') : null
  const parentLabel3 = parentPath3 ? (PATH_LABELS[parentPath3] || EXTRA_LABELS[parentPath3]) : null

  if (parentLabel3 && segments.length > 3) {
    // e.g. /host/spa/trattamenti/[id] → ["Trattamenti", "Dettaglio"]
    crumbs.push({ label: resolveLabel(parentLabel3), href: parentPath3! })
    crumbs.push({ label: formatDetailLabel(segments[segments.length - 1]), href: pathname })
  } else if (parentLabel2 && segments.length > 2) {
    // e.g. /host/prenotazioni/[id] → ["Prenotazioni", "Dettaglio #ABC"]
    // Check if the 3rd segment is a known sub-page
    const subPath = '/' + segments.slice(0, 3).join('/')
    const subLabel = PATH_LABELS[subPath] || EXTRA_LABELS[subPath]
    if (subLabel) {
      // Known sub-page like /host/prenotazioni/nuova
      crumbs.push({ label: resolveLabel(parentLabel2), href: parentPath2 })
      crumbs.push({ label: resolveLabel(subLabel), href: subPath })
      // If there's a 4th segment, add detail
      if (segments.length > 3) {
        crumbs.push({ label: formatDetailLabel(segments[segments.length - 1]), href: pathname })
      }
    } else {
      // Dynamic ID like /host/prenotazioni/clxyz123
      crumbs.push({ label: resolveLabel(parentLabel2), href: parentPath2 })
      crumbs.push({ label: formatDetailLabel(segments[segments.length - 1]), href: pathname })
    }
  } else if (parentLabel2) {
    crumbs.push({ label: resolveLabel(parentLabel2), href: parentPath2 })
  } else {
    // Fallback: capitalize the path segment
    crumbs.push({ label: capitalize(segments[1]), href: parentPath2 })
    if (segments.length > 2) {
      crumbs.push({ label: formatDetailLabel(segments[segments.length - 1]), href: pathname })
    }
  }

  // Max 2 levels for cleanliness
  return crumbs.slice(0, 2)
}

function formatDetailLabel(segment: string): string {
  // If it looks like an ID (cuid, uuid), show "Dettaglio"
  if (segment.length > 15 || /^[a-z0-9]{20,}$/i.test(segment) || /^[0-9a-f-]{36}$/i.test(segment)) {
    return 'Dettaglio'
  }
  // If it looks like a short ID, show truncated
  if (/^[a-z0-9]+$/i.test(segment) && segment.length > 8) {
    return `#${segment.slice(0, 8).toUpperCase()}`
  }
  // Named segment: "nuova", "menu", etc.
  return capitalize(segment.replace(/-/g, ' '))
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Role labels ────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Amministratore',
  DIREZIONE: 'Direzione',
  HOST: 'Manager',
  STAFF: 'Staff',
}

// ─── Theme toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
      title={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
