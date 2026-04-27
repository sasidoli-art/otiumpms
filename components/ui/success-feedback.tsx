/**
 * SuccessFeedback — feedback visivo per azioni completate.
 *
 *   <SuccessFeedback titolo="Prenotazione confermata!" descrizione="..." />
 *
 * Animazione (~600ms totale):
 *   1. Cerchio cresce da scale 0 a 1 con bounce spring (~400ms)
 *   2. Check viene "tracciato" via stroke-dashoffset (~300ms, parte a 200ms)
 *
 * Usato in:
 *   - Conferma prenotazione (post-submit step 3 booking flow)
 *   - Check-in completato (post-firma kiosk/online)
 *   - Pagamento registrato (POS / SPA)
 *   - Cassa chiusa (chiusura giornaliera)
 *   - Configurazione completata (onboarding step finale)
 *
 * Props:
 *   - titolo, descrizione: testo principale + supporto
 *   - tone: 'success' (default) | 'primary' — per cassa/onboarding usa primary
 *   - actions: ReactNode opzionale sotto i testi (es. <Button>Continua</Button>)
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SuccessFeedbackProps = {
  titolo: string
  descrizione?: string
  tone?: 'success' | 'primary'
  actions?: ReactNode
  className?: string
}

export function SuccessFeedback({
  titolo,
  descrizione,
  tone = 'success',
  actions,
  className,
}: SuccessFeedbackProps) {
  const ringBg = tone === 'success' ? 'bg-success-100' : 'bg-primary-100'
  const checkColor = tone === 'success' ? 'var(--color-success-600)' : 'var(--color-primary-600)'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center text-center max-w-md mx-auto', className)}
    >
      {/* Cerchio + check */}
      <div
        className={cn(
          'relative w-16 h-16 rounded-full flex items-center justify-center',
          ringBg,
          // Spring scale-in (one-shot, 400ms)
          'animate-[successCircleIn_400ms_var(--spring)_both]',
        )}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M9 16.5l5 5L23 11"
            stroke={checkColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="24"
            // Disegno la spunta dopo il bounce del cerchio (delay 200ms)
            style={{
              strokeDashoffset: 24,
              animation: 'drawCheck 300ms var(--ease-out) 200ms forwards',
            }}
          />
        </svg>
      </div>

      <h2 className="mt-5 text-[20px] font-semibold leading-tight tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
        {titolo}
      </h2>

      {descrizione && (
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
          {descrizione}
        </p>
      )}

      {actions && (
        <div className="mt-6 flex flex-col sm:flex-row gap-2 items-center justify-center">
          {actions}
        </div>
      )}
    </div>
  )
}

export default SuccessFeedback
