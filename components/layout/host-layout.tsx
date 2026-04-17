'use client'

import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  useMemo, type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { HostSidebar } from '@/components/host/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BugReportButton } from '@/components/layout/bug-report-button'
import { QuickSwitcher } from '@/components/layout/quick-switcher'
import { MobileNav } from '@/components/layout/mobile-nav'
import { useSidebarBadges, type BadgeCounts } from '@/hooks/use-sidebar-badges'

// ─── Sidebar context ────────────────────────────────────────────────────────

interface SidebarState {
  /** Mobile overlay open */
  isOpen: boolean
  /** Desktop mini mode (64px) */
  isCollapsed: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
  collapseSidebar: () => void
}

const SidebarContext = createContext<SidebarState>({
  isOpen: false,
  isCollapsed: false,
  toggleSidebar: () => {},
  closeSidebar: () => {},
  collapseSidebar: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

// ─── Struttura context ──────────────────────────────────────────────────────

interface StrutturaState {
  strutturaCorrente: { id: string; nome: string } | null
  strutture: { id: string; nome: string }[]
  setStruttura: (id: string) => void
}

const StrutturaContext = createContext<StrutturaState>({
  strutturaCorrente: null,
  strutture: [],
  setStruttura: () => {},
})

export function useStruttura() {
  return useContext(StrutturaContext)
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface HostLayoutProps {
  nomeUtente: string
  email?: string | null
  nomeAzienda: string
  moduliAttivi: unknown
  logo?: string | null
  ruolo: string
  staffRole?: string | null
  piano?: string | null
  hostId?: string | null
  strutture: { id: string; nome: string }[]
  strutturaAttivaId?: string | null
  children: ReactNode
}

// ─── Component ──────────────────────────────────────────────────────────────

export function HostLayout({
  nomeUtente, email, nomeAzienda, moduliAttivi, logo, ruolo,
  staffRole, piano, hostId,
  strutture, strutturaAttivaId, children,
}: HostLayoutProps) {
  const pathname = usePathname()
  const touchStartX = useRef(0)
  const mainRef = useRef<HTMLElement>(null)

  // ── Badge polling (single source, passed to sidebar + topbar) ──
  const { data: badges } = useSidebarBadges()

  // ── Quick switcher state ──
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)

  // ── Sidebar state ──
  const [isOpen, setIsOpen] = useState(false)
  // isCollapsed is managed inside the sidebar via localStorage;
  // we don't duplicate it here — sidebar reads its own persisted state.

  const toggleSidebar = useCallback(() => setIsOpen(v => !v), [])
  const closeSidebar = useCallback(() => setIsOpen(false), [])

  const sidebarValue = useMemo<SidebarState>(() => ({
    isOpen,
    isCollapsed: false, // sidebar manages its own collapsed state internally
    toggleSidebar,
    closeSidebar,
    collapseSidebar: () => {}, // controlled by sidebar internally
  }), [isOpen, toggleSidebar, closeSidebar])

  // ── Struttura state ──
  const [strutturaId, setStrutturaId] = useState(strutturaAttivaId ?? null)

  const strutturaCorrente = useMemo(
    () => strutture.find(s => s.id === strutturaId) ?? (strutture.length === 1 ? strutture[0] : null),
    [strutture, strutturaId],
  )

  const setStruttura = useCallback((id: string) => {
    setStrutturaId(id)
    // The actual persistence (cookie) is handled by the StrutturaSwitcher
    // component calling POST /api/host/struttura-attiva
  }, [])

  const strutturaValue = useMemo<StrutturaState>(() => ({
    strutturaCorrente,
    strutture,
    setStruttura,
  }), [strutturaCorrente, strutture, setStruttura])

  // ── Close mobile sidebar on route change ──
  useEffect(() => { setIsOpen(false) }, [pathname])

  // ── Global keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Escape closes mobile sidebar
      if (e.key === 'Escape') setIsOpen(false)
      // Cmd+K / Ctrl+K opens quick switcher
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setQuickSwitcherOpen(v => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // ── Swipe left to close mobile sidebar ──
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -80) setIsOpen(false)
  }, [])

  // ── Common sidebar props ──
  const sidebarProps = {
    nomeUtente,
    nomeAzienda,
    moduliAttivi,
    logo,
    ruolo,
    staffRole,
    piano,
    hostId,
    struttureHost: strutture,
    strutturaAttivaId: strutturaId,
    badges,
  }

  return (
    <SidebarContext.Provider value={sidebarValue}>
      <StrutturaContext.Provider value={strutturaValue}>
        {/* Skip link — hidden, visible on focus */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
        >
          Vai al contenuto
        </a>

        <div className="flex h-screen overflow-hidden">
          {/* ── Mobile backdrop ──────────────────────────────── */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={closeSidebar}
                aria-hidden="true"
              />
            )}
          </AnimatePresence>

          {/* ── Sidebar: desktop (static) ────────────────────── */}
          <div className="hidden lg:block shrink-0">
            <HostSidebar {...sidebarProps} />
          </div>

          {/* ── Sidebar: mobile overlay ──────────────────────── */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 left-0 z-50 lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Menu navigazione"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <HostSidebar {...sidebarProps} onMobileClose={closeSidebar} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Main column ──────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Topbar
              nomeUtente={nomeUtente}
              email={email}
              ruolo={ruolo}
              onMenuClick={toggleSidebar}
              strutture={strutture}
              strutturaAttivaId={strutturaId}
              badges={badges}
            />

            <main
              id="main-content"
              ref={mainRef}
              className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 md:p-6 lg:p-8 pb-20 md:pb-6 lg:pb-8"
            >
              {children}
            </main>
          </div>

          {/* Mobile bottom nav (< 768px) */}
          <MobileNav onMenuClick={toggleSidebar} badges={badges} />

          <BugReportButton />
        </div>

        {/* Quick switcher (Cmd+K) */}
        <QuickSwitcher
          open={quickSwitcherOpen}
          onClose={() => setQuickSwitcherOpen(false)}
          moduliAttivi={moduliAttivi}
          ruolo={ruolo}
          staffRole={staffRole}
        />
      </StrutturaContext.Provider>
    </SidebarContext.Provider>
  )
}
