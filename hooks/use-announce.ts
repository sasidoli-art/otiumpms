'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Screen reader announcements for dynamic state changes.
 *
 * Creates a visually hidden aria-live region and injects text
 * that will be read by screen readers.
 *
 * Usage:
 *   const announce = useAnnounce()
 *   announce('Prenotazione confermata')
 *   announce('Errore: email non valida', 'assertive')
 */
export function useAnnounce() {
  const regionRef = useRef<HTMLDivElement | null>(null)

  // Create the live region on mount
  useEffect(() => {
    const el = document.createElement('div')
    el.setAttribute('aria-live', 'polite')
    el.setAttribute('aria-atomic', 'true')
    el.setAttribute('role', 'status')
    Object.assign(el.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      border: '0',
    })
    document.body.appendChild(el)
    regionRef.current = el

    return () => {
      document.body.removeChild(el)
      regionRef.current = null
    }
  }, [])

  const announce = useCallback((message: string, politeness?: 'polite' | 'assertive') => {
    const el = regionRef.current
    if (!el) return

    if (politeness) el.setAttribute('aria-live', politeness)

    // Clear and re-set to trigger screen reader announcement
    el.textContent = ''
    requestAnimationFrame(() => {
      el.textContent = message
    })
  }, [])

  return announce
}
