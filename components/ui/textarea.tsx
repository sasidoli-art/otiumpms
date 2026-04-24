/**
 * Textarea — stessi stili dell'Input, resize verticale manuale.
 * Range altezza: min-80px, max-300px (scroll interno oltre).
 */
import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean
  /** Se true, auto-resize disabilitato e altezza fissa. Default: resize vertical. */
  noResize?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error, noResize, className, rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={error || undefined}
        className={cn(
          'w-full px-3 py-2.5 bg-white rounded-md border text-neutral-900 placeholder:text-neutral-400 text-[14px]',
          'transition-[border-color,box-shadow] duration-fast ease-out',
          'min-h-[80px] max-h-[300px]',
          noResize ? 'resize-none' : 'resize-y',

          !error && 'border-neutral-200 hover:border-neutral-300 hover:shadow-xs',
          !error && 'focus:outline-none focus:border-primary-500 focus:shadow-focus focus-visible:outline-none',
          error && 'border-error-500 focus:outline-none focus:shadow-focus-error focus-visible:outline-none',
          'disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-neutral-200',

          className,
        )}
        {...rest}
      />
    )
  },
)

Textarea.displayName = 'Textarea'

export default Textarea
