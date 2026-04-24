/**
 * Radio — custom styled con native input sr-only + sibling indicator.
 *
 * - 18px × 18px, border-radius full, border 2px neutral-300
 * - Selected: border primary-600, inner dot 8px primary-600
 * - Inner dot appare con scale spring
 */
'use client'

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label?: ReactNode
  description?: ReactNode
  error?: boolean
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  function Radio({ label, description, error, className, id, disabled, ...rest }, ref) {
    const autoId = useId()
    const inputId = id ?? autoId

    return (
      <div className={cn('inline-flex items-start gap-2', disabled && 'opacity-60 cursor-not-allowed', className)}>
        <span className="relative inline-flex shrink-0 w-[18px] h-[18px]">
          <input
            ref={ref}
            id={inputId}
            type="radio"
            disabled={disabled}
            aria-invalid={error || undefined}
            className="peer sr-only"
            {...rest}
          />

          {/* Cornice */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 rounded-full border-2 bg-white',
              'transition-colors duration-fast ease-out',
              'border-neutral-300 peer-hover:border-neutral-400',
              'peer-checked:border-primary-600',
              error && 'border-error-500 peer-checked:border-error-600',
              'peer-focus-visible:shadow-focus',
              error && 'peer-focus-visible:shadow-focus-error',
              'peer-disabled:bg-neutral-100 peer-disabled:border-neutral-200',
            )}
          />

          {/* Inner dot 8px */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 m-auto w-[8px] h-[8px] rounded-full bg-primary-600 pointer-events-none',
              'scale-0 opacity-0 peer-checked:scale-100 peer-checked:opacity-100',
              'transition-[transform,opacity] duration-200 ease-spring',
              error && 'bg-error-600',
            )}
          />
        </span>

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

Radio.displayName = 'Radio'

/**
 * RadioGroup — container per radio correlati.
 * Applica name condiviso + orientamento.
 */
export type RadioGroupProps = {
  name: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  orientation?: 'vertical' | 'horizontal'
  className?: string
  children: ReactNode
}

export function RadioGroup({
  name, value, defaultValue, onChange, orientation = 'vertical', className, children,
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'flex',
        orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row gap-4 flex-wrap',
        className,
      )}
      onChange={(e) => {
        const target = e.target as HTMLInputElement
        if (target.name === name && target.checked) onChange?.(target.value)
      }}
      data-value={value ?? defaultValue ?? ''}
    >
      {children}
    </div>
  )
}

export default Radio
