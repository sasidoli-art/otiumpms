'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BedDouble, Sparkles, UtensilsCrossed, Package, type LucideIcon } from 'lucide-react'
import type { StrutturaPubblica } from '@/lib/book/get-struttura-pubblica'
import { cn } from '@/lib/utils'

type Tab = { href: string; label: string; icon: LucideIcon }

/**
 * Booking nav tabs con animated underline indicator (single sliding element).
 *
 * `light=true` → rendering su hero scuro (testo bianco, underline primary)
 * `light=false` → rendering su header glass (testo neutral-700)
 */
export default function BookingNavTabs({
  struttura,
  light = false,
}: {
  struttura: StrutturaPubblica
  light?: boolean
}) {
  const pathname = usePathname() ?? ''
  const base = `/book/${struttura.id}`

  const tabs: Tab[] = []
  if (struttura.moduli.prenotazioni) tabs.push({ href: `${base}/camere`, label: 'Camere', icon: BedDouble })
  if (struttura.moduli.spa) tabs.push({ href: `${base}/spa`, label: 'SPA', icon: Sparkles })
  if (struttura.moduli.ristorazione) tabs.push({ href: `${base}/ristorante`, label: 'Ristorante', icon: UtensilsCrossed })
  if (struttura.moduli.pacchetti) tabs.push({ href: `${base}/pacchetti`, label: 'Pacchetti', icon: Package })

  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  const activeIdx = tabs.findIndex((t) => pathname === t.href || pathname.startsWith(t.href + '/'))

  useLayoutEffect(() => {
    if (activeIdx < 0 || !containerRef.current) {
      setIndicator(null)
      return
    }
    const tabEl = tabRefs.current[activeIdx]
    const container = containerRef.current
    if (!tabEl) return
    const tabRect = tabEl.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    setIndicator({
      left: tabRect.left - containerRect.left,
      width: tabRect.width,
    })
  }, [activeIdx, pathname, tabs.length])

  if (tabs.length < 2) return null

  // Underline color: usa --brand-primary (iniettato da BookingLayout tramite CSS vars)
  const underlineStyle = indicator
    ? {
        transform: `translateX(${indicator.left}px)`,
        width: `${indicator.width}px`,
        backgroundColor: 'var(--brand-primary)',
      }
    : { width: 0 }

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-1"
      role="tablist"
    >
      {tabs.map((t, i) => {
        const active = i === activeIdx
        const Icon = t.icon
        return (
          <Link
            key={t.href}
            ref={(el) => { tabRefs.current[i] = el }}
            href={t.href}
            role="tab"
            aria-selected={active}
            className={cn(
              'flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-[14px] font-medium whitespace-nowrap',
              'transition-colors duration-fast ease-out',
              active
                ? light ? 'text-white' : 'text-neutral-900'
                : light ? 'text-white/70 hover:text-white' : 'text-neutral-500 hover:text-neutral-800',
            )}
            style={active ? { color: light ? undefined : 'var(--brand-primary)' } : undefined}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {t.label}
          </Link>
        )
      })}

      {/* Sliding underline indicator */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 h-[2px] rounded-full transition-[transform,width,background-color] duration-normal ease-out pointer-events-none"
        style={underlineStyle}
      />
    </div>
  )
}
