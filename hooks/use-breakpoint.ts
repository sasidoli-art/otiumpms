'use client'

import { useState, useEffect } from 'react'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const QUERIES: [Breakpoint, string][] = [
  ['desktop', '(min-width: 1024px)'],
  ['tablet', '(min-width: 768px)'],
  ['mobile', '(max-width: 767px)'],
]

/**
 * Returns current breakpoint: 'mobile' | 'tablet' | 'desktop'.
 * Based on window.matchMedia (event-driven, not polling).
 * SSR-safe: defaults to 'desktop'.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop')

  useEffect(() => {
    function check() {
      for (const [name, query] of QUERIES) {
        if (window.matchMedia(query).matches) {
          setBp(name)
          return
        }
      }
      setBp('mobile')
    }

    check()

    const mediaLists = QUERIES.map(([, query]) => window.matchMedia(query))
    const handler = () => check()

    for (const ml of mediaLists) {
      ml.addEventListener('change', handler)
    }

    return () => {
      for (const ml of mediaLists) {
        ml.removeEventListener('change', handler)
      }
    }
  }, [])

  return bp
}

/** Convenience: true if mobile */
export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile'
}
