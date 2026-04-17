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
  strutturaNome: string
  logo?: string | null
  colorePrimario?: string | null
  summary: BookingSummary
}

/**
 * Layout wrapper per il booking SPA pubblico.
 * Logo + card centrata + riepilogo sticky in basso.
 */
export function SpaBookingLayout({
  children, strutturaNome, logo, colorePrimario, summary,
}: Props) {
  const accent = colorePrimario || '#4f46e5'
  const [summaryOpen, setSummaryOpen] = useState(false)
  const hasSummary = summary.servizioNome || summary.prezzo

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* ─── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={strutturaNome} className="h-8 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: accent }}>
                {strutturaNome.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{strutturaNome}</p>
              <p className="text-[10px] text-gray-400">SPA & Benessere</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white"
            style={{ backgroundColor: accent }}>
            Prenota
          </span>
        </div>
      </header>

      {/* ─── Content ───────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto">
        <div className="sm:my-4 sm:bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-100">
          {children}
        </div>
      </main>

      {/* ─── Riepilogo sticky in basso ─────────────────────────── */}
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
