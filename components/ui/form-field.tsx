/**
 * FormField — wrapper label + error + helper text per QUALSIASI input.
 *
 *   <FormField label="Email" required helperText="Per le comunicazioni" error={errors.email}>
 *     <Input type="email" placeholder="nome@hotel.it" />
 *   </FormField>
 *
 * Layout:
 *   - Label sopra, `text-label`, margin-bottom 4px
 *   - Required → pallino rosso 4px dopo la label (no asterisco — più elegante)
 *   - Children (input/textarea/select/checkbox/radio/toggle) sotto la label
 *   - Helper text sotto l'input, `text-caption`, `text-tertiary`
 *   - Error sotto l'input (sostituisce helper), `error-600`, con animazione slideDown
 *
 * Children può essere ReactNode o function-as-children per ricevere ids a11y:
 *   <FormField label="Nome">
 *     {({ inputId, errorId }) => <Input id={inputId} aria-describedby={errorId} />}
 *   </FormField>
 */
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  className?: string
  /** HTML id per l'input — auto-generated se non passato */
  htmlFor?: string
  children: ReactNode | ((ids: { inputId: string; errorId: string; helperId: string }) => ReactNode)
}

export function FormField({
  label, error, helperText, required, className, htmlFor, children,
}: FormFieldProps) {
  const autoId = useId()
  const inputId = htmlFor || autoId
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  const hasError = !!error

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="flex items-center gap-1 mb-1 text-[13px] font-medium text-neutral-700 tracking-[0.01em]"
        >
          <span>{label}</span>
          {required && (
            <span
              aria-label="obbligatorio"
              className="inline-block w-1 h-1 rounded-full bg-error-500"
            />
          )}
        </label>
      )}

      {typeof children === 'function'
        ? children({ inputId, errorId, helperId })
        : children}

      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-[12px] leading-[1.4] text-error-600 animate-slideDown"
        >
          {error}
        </p>
      )}
      {!hasError && helperText && (
        <p id={helperId} className="mt-1 text-[12px] leading-[1.4] text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  )
}

/**
 * FormGrid — layout responsive per gruppi di campi.
 *
 *   <FormGrid cols={2}>
 *     <FormField label="Nome"><Input /></FormField>
 *     <FormField label="Cognome"><Input /></FormField>
 *   </FormGrid>
 *
 * - cols={2}: 2 colonne su desktop, 1 su mobile
 * - cols={1}: sempre 1 colonna (default)
 * - gap verticale 16px (form-field spacing standard)
 */
export function FormGrid({
  cols = 1,
  children,
  className,
}: {
  cols?: 1 | 2 | 3
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-y-4 gap-x-4',
        cols === 1 && 'grid-cols-1',
        cols === 2 && 'grid-cols-1 md:grid-cols-2',
        cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * FormSection — gruppo di campi correlati con label + divider.
 *
 *   <FormSection label="Dati anagrafici" description="Come appariranno in fattura">
 *     <FormGrid cols={2}>...</FormGrid>
 *   </FormSection>
 */
export function FormSection({
  label,
  description,
  children,
  className,
}: {
  label?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('pb-6 mb-6 border-b border-neutral-200 last:border-b-0 last:mb-0 last:pb-0', className)}>
      {(label || description) && (
        <header className="mb-4">
          {label && (
            <h3 className="text-[15px] font-semibold text-neutral-900 tracking-[-0.01em]">
              {label}
            </h3>
          )}
          {description && (
            <p className="mt-0.5 text-[13px] text-neutral-500 leading-relaxed">{description}</p>
          )}
        </header>
      )}
      {children}
    </section>
  )
}
