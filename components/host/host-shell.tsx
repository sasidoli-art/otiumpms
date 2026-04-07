'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { HostSidebar } from './sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BugReportButton } from '@/components/layout/bug-report-button'

interface Props {
  nomeUtente: string
  nomeAzienda: string
  moduliAttivi: unknown
  logo?: string | null
  ruolo: string
  strutture?: { id: string; nome: string }[]
  strutturaAttivaId?: string | null
  children: React.ReactNode
}

export function HostShell({ nomeUtente, nomeAzienda, moduliAttivi, logo, ruolo, strutture, strutturaAttivaId, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close on escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, shown on lg+ */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <HostSidebar
          nomeUtente={nomeUtente}
          nomeAzienda={nomeAzienda}
          moduliAttivi={moduliAttivi}
          logo={logo}
          ruolo={ruolo}
          onMobileClose={() => setMobileOpen(false)}
          struttureHost={strutture}
          strutturaAttivaId={strutturaAttivaId}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          nomeUtente={nomeUtente}
          ruolo={ruolo}
          settingsHref="/host/profilo"
          onMenuClick={() => setMobileOpen(v => !v)}
          strutture={strutture}
          strutturaAttivaId={strutturaAttivaId}
        />
        <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 md:p-6">
          {children}
        </main>
      </div>

      <BugReportButton />
    </div>
  )
}
