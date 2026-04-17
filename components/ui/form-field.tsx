import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function FormField({ label, error, helperText, required, className, children }: Props) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1.5">
          {label}
          {required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-[12px] text-[var(--color-error)] mt-1">{error}</p>
      )}
      {!error && helperText && (
        <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{helperText}</p>
      )}
    </div>
  )
}

/** Standard text input — use inside FormField */
export function Input({
  error, className, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={cn(
        'input',
        error && 'input-error',
        className,
      )}
      {...props}
    />
  )
}

/** Standard textarea — use inside FormField */
export function Textarea({
  error, className, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={cn(
        'input resize-none',
        error && 'input-error',
        className,
      )}
      {...props}
    />
  )
}

/** Standard select — use inside FormField */
export function Select({
  error, className, children, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={cn(
        'input pr-8 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        error && 'input-error',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
