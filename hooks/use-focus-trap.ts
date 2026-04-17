'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Traps focus inside a container element.
 * Tab and Shift+Tab cycle through focusable elements.
 * Restores focus to the previously focused element on unmount.
 *
 * @param containerRef - ref to the container element
 * @param active - whether the trap is active (e.g. modal open)
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    // Save currently focused element to restore later
    previousFocus.current = document.activeElement as HTMLElement

    const container = containerRef.current
    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (focusable.length > 0) focusable[0].focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const els = container.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (els.length === 0) return

      const first = els[0]
      const last = els[els.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restore focus
      previousFocus.current?.focus()
    }
  }, [active, containerRef])
}
