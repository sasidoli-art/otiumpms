/**
 * Toggle — switch accessibile (role="switch").
 *
 * - Track 40 × 22 px, radius full
 * - Thumb 18 px, bianco, shadow-sm
 * - Off: track neutral-200. On: track primary-600, thumb traslato.
 * - Transizione bg + transform duration-normal ease-out.
 * - Press (active): thumb scale(1.05) via group-active modifier.
 */
'use client'

import { forwardRef, useCallback, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ToggleProps = {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: ReactNode
  description?: ReactNode
  id?: string
  'aria-label'?: string
  className?: string
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  function Toggle(
    { checked, defaultChecked = false, onChange, disabled, label, description, id, className, ...aria },
    ref,
  ) {
    const [internal, setInternal] = useState(defaultChecked)
    const isControlled = checked !== undefined
    const on = isControlled ? checked : internal

    const toggle = useCallback(() => {
      if (disabled) return
      const next = !on
      if (!isControlled) setInternal(next)
      onChange?.(next)
    }, [disabled, on, isControlled, onChange])

    const switchEl = (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={aria['aria-label']}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          'group relative inline-flex items-center w-10 h-[22px] rounded-full shrink-0',
          'transition-colors duration-normal ease-out',
          'focus-visible:outline-none focus-visible:shadow-focus',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          on ? 'bg-primary-600' : 'bg-neutral-200 hover:bg-neutral-300',
          disabled && on && 'hover:bg-primary-600',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block w-[18px] h-[18px] rounded-full bg-white shadow-sm',
            'transition-transform duration-normal ease-out',
            'group-active:scale-[1.05]',
            on ? 'translate-x-[20px]' : 'translate-x-[2px]',
          )}
        />
      </button>
    )

    if (!label && !description) {
      return <span className={className}>{switchEl}</span>
    }

    // Label a destra del toggle, cliccabile via `htmlFor`-less wrapper (button non è <input>,
    // quindi uso un click sul label che richiama toggle).
    return (
      <label
        className={cn(
          'inline-flex items-start gap-3',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          className,
        )}
        onClick={(e) => {
          // Evita doppio toggle quando il click è già sul button nativo
          if ((e.target as HTMLElement).closest('button[role="switch"]')) return
          toggle()
        }}
      >
        {switchEl}
        <span className="text-[14px] leading-[1.4]">
          {label && <span className="text-neutral-900">{label}</span>}
          {description && (
            <span className="block text-[12px] text-neutral-500 mt-0.5">{description}</span>
          )}
        </span>
      </label>
    )
  },
)

Toggle.displayName = 'Toggle'

export default Toggle
