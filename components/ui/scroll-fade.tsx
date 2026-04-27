/**
 * ScrollFade — wrapper per carousel orizzontali con fade-mask intelligente.
 *
 *   <ScrollFade>
 *     <div className="flex gap-2">
 *       {pills.map(...)}
 *     </div>
 *   </ScrollFade>
 *
 * Differenze vs `.scroll-fade-x` puro CSS:
 *   - Nasconde la fade quando il contenuto NON è scrollabile (no overflow)
 *   - Fade-left appare solo se l'utente ha scrollato via dall'inizio
 *   - Fade-right appare solo se NON si è in fondo
 *   - Riascolta resize del viewport e cambi del contenuto (ResizeObserver)
 *
 * Combina `.no-scrollbar` + `mask-image` dinamica via inline style.
 */
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ScrollFadeProps = {
  children: ReactNode
  className?: string
  /** Larghezza della fade in pixel (default 16). */
  fadeWidth?: number
  /** Soglia in px per considerare "in fondo" / "a inizio" (default 4). */
  threshold?: number
}

export function ScrollFade({
  children,
  className,
  fadeWidth = 16,
  threshold = 4,
}: ScrollFadeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function update() {
      if (!el) return
      const { scrollLeft, scrollWidth, clientWidth } = el
      const overflows = scrollWidth > clientWidth + 1
      setFadeLeft(overflows && scrollLeft > threshold)
      setFadeRight(overflows && scrollLeft < scrollWidth - clientWidth - threshold)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })

    // ResizeObserver: re-check su cambio dimensione viewport o contenuto
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // Osserva anche il primo figlio (track del flex), così il cambio di
    // numero di item rifà il calcolo
    if (el.firstElementChild) ro.observe(el.firstElementChild)

    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [threshold])

  // Costruisce dinamicamente la mask-image: opacità 1 per i lati senza fade,
  // gradiente per i lati con fade attivo.
  const maskImage = (() => {
    const left = fadeLeft ? 'transparent' : 'black'
    const right = fadeRight ? 'transparent' : 'black'
    return `linear-gradient(to right, ${left}, black ${fadeWidth}px, black calc(100% - ${fadeWidth}px), ${right})`
  })()

  return (
    <div
      ref={ref}
      className={cn('overflow-x-auto no-scrollbar', className)}
      style={{
        WebkitMaskImage: maskImage,
        maskImage,
        // Transition lieve sulla mask per smussare la comparsa/scomparsa fade
        transition: 'mask-image 120ms var(--ease-out), -webkit-mask-image 120ms var(--ease-out)',
      }}
    >
      {children}
    </div>
  )
}

export default ScrollFade
