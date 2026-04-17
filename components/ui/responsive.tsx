import type { ReactNode } from 'react'

/**
 * Show children only on mobile (< 768px).
 * Uses pure CSS — no JS resize observer.
 */
export function MobileOnly({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`md:hidden ${className ?? ''}`}>{children}</div>
}

/**
 * Show children only on tablet+ (>= 768px).
 */
export function TabletUp({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`hidden md:block ${className ?? ''}`}>{children}</div>
}

/**
 * Show children only on desktop (>= 1024px).
 */
export function DesktopOnly({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`hidden lg:block ${className ?? ''}`}>{children}</div>
}

/**
 * Show children only below desktop (< 1024px).
 */
export function BelowDesktop({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`lg:hidden ${className ?? ''}`}>{children}</div>
}
