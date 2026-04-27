/**
 * Tooltip — popover testuale on hover/focus.
 *
 *   <Tooltip content="Spiega questa azione">
 *     <button>?</button>
 *   </Tooltip>
 *
 * - Appare dopo 400ms di hover (no flickering)
 * - Bg neutral-800 / testo bianco / 12px / radius-sm / shadow-md
 * - Posizione: sopra il trigger; flip a sotto se non c'è spazio
 * - Animazione: fade + translateY -4px, duration-fast
 * - Max-width 200px, word-wrap, arrow 4px verso il trigger
 *
 * Accessibilità: usa `aria-describedby`, attivo anche su focus-visible (keyboard).
 */
'use client'

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

const SHOW_DELAY = 400
const HIDE_DELAY = 80

export type TooltipProps = {
  content: ReactNode
  /** Se true, disabilita il tooltip (usato per gating contestuali) */
  disabled?: boolean
  /** Posizione preferita; default 'top' con auto-flip a 'bottom' */
  side?: 'top' | 'bottom'
  /** Wrapper className per casi in cui il trigger ha spacing custom */
  className?: string
  children: ReactElement | ReactNode
}

export function Tooltip({
  content,
  disabled,
  side = 'top',
  className,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [actualSide, setActualSide] = useState<'top' | 'bottom'>(side)
  const showTimer = useRef<ReturnType<typeof setTimeout>>()
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()

  function show() {
    if (disabled) return
    clearTimeout(hideTimer.current)
    showTimer.current = setTimeout(() => setOpen(true), SHOW_DELAY)
  }

  function hide() {
    clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY)
  }

  useEffect(() => {
    return () => {
      clearTimeout(showTimer.current)
      clearTimeout(hideTimer.current)
    }
  }, [])

  // Auto-flip: se top non ha spazio, vai bottom
  useEffect(() => {
    if (!open || !wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 30
    if (side === 'top' && rect.top < tooltipHeight + 12) {
      setActualSide('bottom')
    } else if (side === 'bottom' && window.innerHeight - rect.bottom < tooltipHeight + 12) {
      setActualSide('top')
    } else {
      setActualSide(side)
    }
  }, [open, side])

  // Inietta aria-describedby + handler sul child se è un elemento, altrimenti
  // wrappa in uno span (no extra DOM se possibile)
  const trigger = isValidElement(children) ? (
    cloneElement(children as ReactElement<Record<string, unknown>>, {
      'aria-describedby': open ? tooltipId : undefined,
    })
  ) : children

  return (
    <span
      ref={wrapperRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {trigger}

      {open && !disabled && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none',
            actualSide === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            'px-2 py-1 max-w-[200px]',
            'bg-neutral-800 text-white text-[12px] leading-tight',
            'rounded-sm shadow-md',
            'break-words whitespace-normal text-center',
            actualSide === 'top'
              ? 'animate-[tooltipInTop_120ms_var(--ease-out)_both]'
              : 'animate-[tooltipInBottom_120ms_var(--ease-out)_both]',
          )}
        >
          {content}
          {/* Arrow 4px */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-800 rotate-45',
              actualSide === 'top' ? '-bottom-1' : '-top-1',
            )}
          />
        </div>
      )}
    </span>
  )
}

export default Tooltip
