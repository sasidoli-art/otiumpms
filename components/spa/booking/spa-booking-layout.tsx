'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Calendar, Clock, Euro } from 'lucide-react'

interface BookingSummary {
  servizioNome?: string | null
  prezzo?: number | null
  durata?: number | null
  data?: string | null
  oraInizio?: string | null
}

interface Props {
  children: ReactNode
  colorePrimario?: string | null
  summary: BookingSummary
}

/**
 * Layout INTERNO del flow SPA: card centrata + riepilogo sticky in basso.
 * L'header/footer white-label del booking engine è gestito da
 * components/book/booking-layout.tsx (wrapper esterno).
 */
export function SpaBookingLayout({ children, colorePrimario, summary }: Props) {
  const accent = colorePrimario || 'var(--brand-primary, #4f46e5)'
  const [summaryOpen, setSummaryOpen] = useState(false)
  const hasSummary = summary.servizioNome || summary.prezzo

  return (
    <div className={hasSummary ? 'pb-32' : ''}>
      <main className="max-w-2xl mx-auto">
        <div className="sm:bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-100">
          {children}
        </div>
      </main>

      {hasSummary && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-2xl mx-auto">
            {/* Mobile: collapsible */}
            <button
              type="button"
              onClick={() => setSummaryOpen(!summaryOpen)}
              className="w-full flex items-center justify-between px-4 py-3 sm:hidden"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {summary.servizioNome || 'Seleziona un servizio'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {summary.prezzo != null && (
                  <span className="text-sm font-bold" style={{ color: accent }}>€{summary.prezzo}</span>
                )}
                {summaryOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {/* Expanded content (always visible on desktop) */}
            <div className={`px-4 pb-3 ${summaryOpen ? 'block' : 'hidden'} sm:flex sm:items-center sm:gap-6 sm:py-3`}>
              {summary.servizioNome && (
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-1 sm:mb-0">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                  <span className="font-medium">{summary.servizioNome}</span>
                </div>
              )}
              {summary.durata && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1 sm:mb-0">
                  <Clock className="w-3 h-3" /> {summary.durata} min
                </div>
              )}
              {summary.data && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1 sm:mb-0">
                  <Calendar className="w-3 h-3" /> {summary.data}
                  {summary.oraInizio && ` ore ${summary.oraInizio}`}
                </div>
              )}
              {summary.prezzo != null && (
                <div className="flex items-center gap-1 text-xs font-bold sm:ml-auto" style={{ color: accent }}>
                  <Euro className="w-3 h-3" /> {summary.prezzo.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
