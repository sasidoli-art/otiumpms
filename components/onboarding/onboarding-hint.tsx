'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lightbulb, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Contextual onboarding hint — appears once per page/feature.
 * Dismissed hints are stored in localStorage and never shown again.
 *
 * Usage:
 *   <OnboardingHint
 *     hintId="prenotazioni-vuota"
 *     hostId={hostId}
 *     titolo="Crea la tua prima prenotazione"
 *     descrizione="Oppure condividi il link di booking con i tuoi ospiti."
 *     azione={{ label: "Nuova prenotazione", href: "/host/prenotazioni/nuova" }}
 *   />
 *
 * Where to use (TODO — add to respective pages):
 * - /host/prenotazioni: if 0 bookings → "Crea la tua prima prenotazione o condividi il link di booking con i tuoi ospiti"
 * - /host/strutture/{id}: if no logo → "Aggiungi il logo della tua struttura per personalizzare le email agli ospiti"
 * - /host/fatture: if SDI not configured → "Configura il provider di fatturazione elettronica per inviare fatture al Sistema di Interscambio"
 * - /host/housekeeping: if 0 tasks → "I task di housekeeping si creano automaticamente quando gli ospiti partono"
 */

interface Props {
  hintId: string
  hostId: string
  titolo: string
  descrizione: string
  azione?: { label: string; href: string }
  dismissibile?: boolean
  className?: string
}

function storageKey(hostId: string, hintId: string): string {
  return `onboarding-hints-${hostId}-${hintId}`
}

export function OnboardingHint({
  hintId, hostId, titolo, descrizione, azione,
  dismissibile = true, className,
}: Props) {
  const [visible, setVisible] = useState(false)

  // Check localStorage on mount
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(storageKey(hostId, hintId))
      if (dismissed !== '1') setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [hostId, hintId])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem(storageKey(hostId, hintId), '1') } catch {}
  }

  if (!visible) return null

  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 rounded-xl',
      'bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-800/50',
      className,
    )}>
      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
        <Lightbulb size={16} className="text-amber-600 dark:text-amber-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {titolo}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          {descrizione}
        </p>
        {azione && (
          <Link
            href={azione.href}
            onClick={dismiss}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline mt-2"
          >
            {azione.label} <ArrowRight size={12} />
          </Link>
        )}
      </div>

      {dismissibile && (
        <button
          onClick={dismiss}
          className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-400 dark:text-amber-600 transition-colors shrink-0"
          aria-label="Chiudi suggerimento"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
