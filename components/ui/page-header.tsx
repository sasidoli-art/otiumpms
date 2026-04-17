'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/*
 * Standard page header for all /host/* pages.
 *
 * TODO: adopt in these pages:
 * - /host/dashboard (already has custom header via DashboardPage)
 * - /host/prenotazioni
 * - /host/prenotazioni/[id]
 * - /host/prenotazioni/nuova
 * - /host/crm
 * - /host/crm/[id]
 * - /host/oggi
 * - /host/calendario
 * - /host/housekeeping
 * - /host/manutenzione
 * - /host/ristorazione
 * - /host/ristorazione/menu
 * - /host/magazzino
 * - /host/oggetti-smarriti
 * - /host/spa (all sub-pages)
 * - /host/pos
 * - /host/cassa
 * - /host/fatture
 * - /host/report
 * - /host/analytics
 * - /host/staff
 * - /host/notifiche
 * - /host/email-automatiche
 * - /host/concierge
 * - /host/promemoria
 * - /host/strutture, /host/strutture/[id]
 * - /host/utenti
 * - /host/moduli
 * - /host/abbonamento
 * - /host/upselling
 * - /host/alloggiati
 * - /host/gdpr
 * - /host/audit
 * - /host/help
 * - /host/profilo
 * - /host/canali
 * - /host/eventi
 * - /host/pacchetti
 */

// ─── Props ──────────────────────────────────────────────────────────────────

interface Tab {
  label: string
  href: string
  active?: boolean
}

interface Props {
  title: string
  description?: string
  actions?: ReactNode
  tabs?: Tab[]
  className?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PageHeader({ title, description, actions, tabs, className }: Props) {
  const pathname = usePathname()

  return (
    <div className={cn('mb-6', className)}>
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="mt-4 flex gap-1 overflow-x-auto no-scrollbar border-b border-[var(--border-default)]">
          {tabs.map(tab => {
            const isActive = tab.active ?? pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                  isActive
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]',
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
