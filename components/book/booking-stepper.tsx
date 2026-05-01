'use client'

/**
 * BookingStepper — stepper presentazionale condiviso da tutti i booking flow
 * pubblici (camere, ristorante, e in futuro SPA).
 *
 * Componente PURO: non gestisce state, riceve `currentStep` e `steps` dal
 * parent. Niente reducer, niente router. La progressione e` controllata
 * dal flow ospitante.
 *
 * Design (allineato al brand della struttura via CSS vars):
 *   - Pallino 32px: completato → bg brand-primary + check; attivo → border
 *     2px brand-primary su bg white; futuro → border neutral-200 + numero
 *   - Linea connettrice 2px: completata = brand-primary, futura = neutral-200
 *   - Label sotto in 10/12px, attiva = neutral-900, altrimenti neutral-500
 *   - Bottone "Indietro" inline (opzionale): mostrato se step > 0 e onBack
 *
 * Usa CSS variables `--brand-primary` e `--brand-on-primary` iniettate dal
 * BookingLayout in base al theme della struttura.
 */
import { Check, ArrowLeft } from 'lucide-react'

export interface BookingStepperProps {
  steps: readonly string[]
  currentStep: number          // 0-indexed
  onBack?: () => void          // se presente: mostra il bottone "Indietro"
  backLabel?: string           // override del label "Indietro" (es. "Modifica data/orario")
  className?: string
}

export default function BookingStepper({
  steps,
  currentStep,
  onBack,
  backLabel = 'Indietro',
  className,
}: BookingStepperProps) {
  return (
    <div className={className}>
      {/* Pallini + linee */}
      <div className="flex items-center justify-between gap-2">
        {steps.map((label, i) => {
          const active = i === currentStep
          const done = i < currentStep
          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    active || done ? '' : 'text-gray-400 border-gray-200 bg-white'
                  }`}
                  style={
                    active || done
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          borderColor: 'var(--brand-primary)',
                          color: 'var(--brand-on-primary)',
                        }
                      : undefined
                  }
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <Check className="w-4 h-4" aria-hidden="true" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] md:text-xs mt-1 font-medium text-center ${
                    active ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 md:mx-3 ${done ? '' : 'bg-gray-200'}`}
                  style={done ? { backgroundColor: 'var(--brand-primary)' } : undefined}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Bottone Indietro (solo se onBack fornito e non al primo step) */}
      {onBack && currentStep > 0 && (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {backLabel}
        </button>
      )}
    </div>
  )
}
