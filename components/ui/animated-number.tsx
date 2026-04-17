'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  duration?: number
  className?: string
  /** Format function (e.g. for currency) */
  format?: (n: number) => string
}

/**
 * Animated counter that interpolates from previous to new value.
 *
 * Usage:
 *   <AnimatedNumber value={arriviOggi} />
 *   <AnimatedNumber value={revenue} format={n => `€${n.toFixed(2)}`} />
 */
export function AnimatedNumber({ value, duration = 400, className, format }: Props) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const frameRef = useRef<number>()

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = value

    if (from === to) return

    // Check reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(to)
      return
    }

    const start = performance.now()
    const diff = to - from

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + diff * eased

      setDisplay(Number.isInteger(to) ? Math.round(current) : parseFloat(current.toFixed(2)))

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [value, duration])

  const formatted = format ? format(display) : String(display)

  return <span className={className}>{formatted}</span>
}
