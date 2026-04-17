'use client'

import { type ReactNode } from 'react'

interface CheckinLayoutProps {
  children: ReactNode
  /** Nome struttura (mostrato nell'header) */
  strutturaNome: string
  /** URL logo struttura (opzionale) */
  logo?: string | null
  /** Colore primario struttura (hex, default indigo-600) */
  colorePrimario?: string | null
  /** Nome host / azienda (piccolo sotto il logo) */
  hostNome?: string
}

/**
 * Layout wrapper per il flusso di check-in online.
 * Nessuna sidebar, nessuna navigazione — solo il flusso ospite.
 * Responsive: card su desktop, full-width su mobile.
 */
export function CheckinLayout({
  children,
  strutturaNome,
  logo,
  colorePrimario,
  hostNome,
}: CheckinLayoutProps) {
  const accent = colorePrimario || '#4f46e5'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header minimalista ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 backdrop-blur-xl border-b border-gray-100"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={strutturaNome}
                className="h-8 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: accent }}
              >
                {strutturaNome.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {strutturaNome}
              </p>
              {hostNome && hostNome !== strutturaNome && (
                <p className="text-[10px] text-gray-400 truncate">{hostNome}</p>
              )}
            </div>
          </div>

          {/* Badge "Check-in" */}
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white"
            style={{ backgroundColor: accent }}
          >
            Check-in
          </span>
        </div>
      </header>

      {/* ─── Contenuto ─────────────────────────────────────────────── */}
      {/* Desktop: card centrata. Mobile: full-width */}
      <main className="max-w-lg mx-auto">
        {/* Card wrapper — visibile solo su desktop */}
        <div className="sm:my-6 sm:bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-100 sm:overflow-hidden">
          {children}
        </div>
      </main>

      {/* ─── Footer legale ─────────────────────────────────────────── */}
      <footer className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-[10px] text-gray-300">
          I dati inseriti sono trattati ai sensi del GDPR e della normativa Alloggiati Web.
          <br />
          Powered by <span className="font-medium">OtiumPMS</span>
        </p>
      </footer>
    </div>
  )
}
