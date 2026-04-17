'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from './sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BugReportButton } from '@/components/layout/bug-report-button'

interface Props {
  nomeUtente: string
  children: React.ReactNode
}

export function AdminShell({ nomeUtente, children }: Props) {
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
        <AdminSidebar nomeUtente={nomeUtente} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          nomeUtente={nomeUtente}
          ruolo="ADMIN"
          onMenuClick={() => setMobileOpen(v => !v)}
        />
        <main className="flex-1 overflow-y-auto bg-[#f5f6f8] dark:bg-slate-950 p-4 md:p-6">
          {children}
        </main>
      </div>
      <BugReportButton />
    </div>
  )
}
