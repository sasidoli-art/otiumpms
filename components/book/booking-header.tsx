'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import type { StrutturaPubblica } from '@/lib/book/get-struttura-pubblica'
import BookingNavTabs from './booking-nav-tabs'

/**
 * Header sticky della shell /book/* — glassmorphism + scroll-aware.
 *
 * - Se `transparentOnTop=true` (c'è un hero sotto): parte completamente
 *   trasparente, diventa glass+shadow dopo aver scrollato la soglia.
 * - Altrimenti: sempre glass (bianco 85% + blur) con shadow leggero.
 *
 * Height 64px. Logo a sinistra (max 28px), tabs al centro, lingua a destra.
 */
export default function BookingHeader({
  struttura,
  transparentOnTop = false,
}: {
  struttura: StrutturaPubblica
  transparentOnTop?: boolean
}) {
  const [scrolled, setScrolled] = useState(!transparentOnTop)

  useEffect(() => {
    if (!transparentOnTop) return
    const threshold = 40
    function onScroll() {
      setScrolled(window.scrollY > threshold)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [transparentOnTop])

  // Stato visuale: glass quando scrollato o senza hero. Altrimenti trasparente.
  const glass = scrolled
  const textColor = glass ? 'text-neutral-900' : 'text-white'

  return (
    <header
      className={[
        'sticky top-0 z-30 h-16 transition-all duration-300 ease-out',
        glass
          ? 'bg-white/85 [backdrop-filter:blur(14px)_saturate(180%)] [-webkit-backdrop-filter:blur(14px)_saturate(180%)] border-b border-white/50 shadow-sm'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="max-w-6xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Logo / nome struttura */}
        <Link
          href={`/book/${struttura.id}`}
          className="flex items-center gap-2.5 min-w-0 shrink-0"
        >
          {struttura.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={struttura.logo}
              alt={struttura.nome}
              className="h-7 md:h-8 w-auto max-w-[120px] md:max-w-[160px] object-contain"
            />
          ) : (
            <div
              className="w-8 h-8 flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: 'var(--brand-primary)',
                color: 'var(--brand-on-primary)',
                borderRadius: 'var(--brand-radius)',
              }}
            >
              {struttura.nome.charAt(0)}
            </div>
          )}
          <span className={`hidden sm:block font-serif text-[15px] leading-tight truncate ${textColor}`}>
            {struttura.nome}
          </span>
        </Link>

        {/* Nav tabs (center) */}
        <nav className="hidden md:flex items-center justify-center flex-1">
          <BookingNavTabs struttura={struttura} light={!glass} />
        </nav>

        {/* Language switcher */}
        <div className={`shrink-0 ${glass ? '' : '[&_button]:text-white [&_svg]:text-white'}`}>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Nav mobile (pills, solo se >1 modulo) */}
      <div className="md:hidden absolute left-0 right-0 top-full bg-white/95 [backdrop-filter:blur(14px)] border-b border-neutral-150">
        <div className="max-w-6xl mx-auto overflow-x-auto no-scrollbar px-4 py-2 flex gap-1">
          <BookingNavTabs struttura={struttura} />
        </div>
      </div>
    </header>
  )
}
