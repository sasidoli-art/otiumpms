/**
 * PageTransition — fade sottile (100ms) ad ogni cambio route.
 *
 *   <PageTransition>{children}</PageTransition>
 *
 * Implementazione: la `key={pathname}` forza il remount al cambio route →
 * la CSS animation `pageFadeIn` (definita in globals.css) parte da capo.
 *
 * Niente Framer Motion — basta una `key` + un'animation breve. Evita il
 * "flash" di contenuto senza diventare distrazione.
 *
 * Da usare nel layout `/host/*` attorno al `{children}` del main.
 */
'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div
      key={pathname}
      className="animate-[pageFadeIn_100ms_var(--ease-out)_both]"
    >
      {children}
    </div>
  )
}

export default PageTransition
