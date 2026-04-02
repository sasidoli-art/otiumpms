'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SuperAdminSidebar } from './sidebar'
import { Topbar } from '@/components/layout/topbar'

interface Props {
  nomeUtente: string
  children: React.ReactNode
}

export function SuperAdminShell({ nomeUtente, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SuperAdminSidebar nomeUtente={nomeUtente} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          nomeUtente={nomeUtente}
          ruolo="ADMIN"
          settingsHref="/superadmin/impostazioni"
          onMenuClick={() => setMobileOpen(v => !v)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-950 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
