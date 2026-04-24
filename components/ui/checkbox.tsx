/**
 * Checkbox — custom styled con native input sr-only + indicator visibile.
 *
 * - 18px × 18px, border 2px neutral-300, radius-xs (4px)
 * - Checked: bg primary-600, border primary-600, check bianco inline SVG
 * - Focus: shadow-focus
 * - Check appare con scale spring (200ms)
 */
'use client'

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label?: ReactNode
  /** Testo descrittivo sotto la label (es. "Riceverò offerte via email") */
  description?: ReactNode
  error?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, description, error, className, id, disabled, ...rest }, ref) {
    const autoId = useId()
    const inputId = id ?? autoId

    return (
      <div className={cn('inline-flex items-start gap-2', disabled && 'opacity-60 cursor-not-allowed', className)}>
        {/* Input + indicator + check SVG come sibling (peer modifier funziona
            solo tra fratelli, non tra antenati/discendenti). */}
        <span className="relative inline-flex shrink-0 w-[18px] h-[18px]">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            aria-invalid={error || undefined}
            className="peer sr-only"
            {...rest}
          />

          {/* Indicator (cornice) */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 rounded-[4px] border-2 bg-white',
              'transition-colors duration-fast ease-out',
              'border-neutral-300 peer-hover:border-neutral-400',
              'peer-checked:bg-primary-600 peer-checked:border-primary-600',
              error && 'border-error-500 peer-checked:bg-error-600 peer-checked:border-error-600',
              'peer-focus-visible:shadow-focus',
              error && 'peer-focus-visible:shadow-focus-error',
              'peer-disabled:bg-neutral-100 peer-disabled:border-neutral-200',
            )}
          />

          {/* Check SVG — sibling del peer, scale spring su checked */}
          <svg
            aria-hidden="true"
            viewBox="0 0 12 10"
            className={cn(
              'absolute inset-0 m-auto w-[12px] h-[10px] text-white pointer-events-none',
              'scale-0 opacity-0 peer-checked:scale-100 peer-checked:opacity-100',
              'transition-[transform,opacity] duration-200 ease-spring',
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 5l3.5 3.5L11 1" />
          </svg>
        </span>

        {/* Label cliccabile (HTML for=inputId) */}
        {(label || description) && (
          <label htmlFor={inputId} className={cn('text-[14px] leading-[1.4]', !disabled && 'cursor-pointer')}>
            {label && <span className="text-neutral-900">{label}</span>}
            {description && (
              <span className="block text-[12px] text-neutral-500 mt-0.5">{description}</span>
            )}
          </label>
        )}
      </div>
    )
  },
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
