/**
 * Input — text input centralizzato.
 *
 * Stati: default, hover (shadow-xs), focus (ring primary), error (ring rosso),
 * disabled (bg neutral-50, cursor not-allowed). Transizioni duration-fast.
 */
import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type InputSize = 'sm' | 'md' | 'lg'

// `size` è un attributo HTML nativo (larghezza colonna). Lo rimappiamo a `inputSize`
// per evitare collisione con il prop visuale.
export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  inputSize?: InputSize
  error?: boolean
}

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: 'h-9 text-[13px]',  // 36px
  md: 'h-10 text-[14px]', // 40px (default)
  lg: 'h-11 text-[15px]', // 44px
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ inputSize = 'md', error, className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={error || undefined}
        className={cn(
          'w-full px-3 bg-white rounded-md border text-neutral-900 placeholder:text-neutral-400',
          'transition-[border-color,box-shadow] duration-fast ease-out',
          SIZE_CLASSES[inputSize],

          // stato: default / hover / focus
          !error && 'border-neutral-200 hover:border-neutral-300 hover:shadow-xs',
          !error && 'focus:outline-none focus:border-primary-500 focus:shadow-focus focus-visible:outline-none',

          // stato: error
          error && 'border-error-500 focus:outline-none focus:shadow-focus-error focus-visible:outline-none',

          // stato: disabled (bg leggermente grigio, testo tenue)
          'disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-neutral-200',

          className,
        )}
        {...rest}
      />
    )
  },
)

Input.displayName = 'Input'

export default Input
