'use client'

import { useState, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

// ─── State Types ────────────────────────────────────────────────────────────

export interface SpaBookingState {
  step: number
  trattamento: { id: string; nome: string; durata: number; prezzo: number } | null
  percorso: { id: string; nome: string; durata: number; prezzo: number } | null
  slot: { data: string; oraInizio: string; terapistaId?: string; terapistaNome?: string } | null
  guest: { nome: string; cognome: string; email: string; telefono: string } | null
  waiver: Record<string, unknown> | null
  pagamento: { metodo: string; note?: string } | null
}

export type SpaBookingAction =
  | { type: 'SET_TRATTAMENTO'; payload: SpaBookingState['trattamento'] }
  | { type: 'SET_PERCORSO'; payload: SpaBookingState['percorso'] }
  | { type: 'SET_SLOT'; payload: SpaBookingState['slot'] }
  | { type: 'SET_GUEST'; payload: SpaBookingState['guest'] }
  | { type: 'SET_WAIVER'; payload: SpaBookingState['waiver'] }
  | { type: 'SET_PAGAMENTO'; payload: SpaBookingState['pagamento'] }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'RESTORE'; payload: SpaBookingState }

export function spaBookingReducer(state: SpaBookingState, action: SpaBookingAction): SpaBookingState {
  switch (action.type) {
    case 'SET_TRATTAMENTO': return { ...state, trattamento: action.payload, percorso: null }
    case 'SET_PERCORSO': return { ...state, percorso: action.payload, trattamento: null }
    case 'SET_SLOT': return { ...state, slot: action.payload }
    case 'SET_GUEST': return { ...state, guest: action.payload }
    case 'SET_WAIVER': return { ...state, waiver: action.payload }
    case 'SET_PAGAMENTO': return { ...state, pagamento: action.payload }
    case 'SET_STEP': return { ...state, step: action.payload }
    case 'RESTORE': return action.payload
  }
}

export const initialSpaBookingState: SpaBookingState = {
  step: 0,
  trattamento: null,
  percorso: null,
  slot: null,
  guest: null,
  waiver: null,
  pagamento: null,
}

// ─── Step Config ────────────────────────────────────────────────────────────

export interface SpaStepConfig {
  id: string
  label: string
  shortLabel: string
  validate?: () => boolean | string
}

// ─── Stepper Component ──────────────────────────────────────────────────────

interface Props {
  steps: SpaStepConfig[]
  currentStep: number
  onStepChange: (step: number) => void
  children: ReactNode[]
  onComplete: () => void | Promise<void>
  completing?: boolean
  completeLabel?: string
  accentColor?: string
}

export function SpaBookingStepper({
  steps, currentStep, onStepChange, children, onComplete,
  completing = false, completeLabel = 'Conferma prenotazione', accentColor,
}: Props) {
  const accent = accentColor || 'var(--brand-primary, #4f46e5)'
  const onAccent = 'var(--brand-on-primary, #ffffff)'
  const [direction, setDirection] = useState(0)
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  function goNext() {
    const step = steps[currentStep]
    if (step.validate) {
      const result = step.validate()
      if (result === false || typeof result === 'string') return
    }
    if (isLast) { onComplete(); return }
    setDirection(1)
    onStepChange(currentStep + 1)
  }

  function goBack() {
    if (isFirst) return
    setDirection(-1)
    onStepChange(currentStep - 1)
  }

  return (
    <div className="flex flex-col min-h-[400px]">
      {/* Stepper bar */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {steps.map((step, i) => {
            const isActive = i === currentStep
            const isDone = i < currentStep
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {i > 0 && <div className="flex-1 h-0.5 transition-colors duration-300" style={{ backgroundColor: isDone ? accent : '#e5e7eb' }} />}
                  <button
                    type="button"
                    onClick={() => { if (isDone) { setDirection(i < currentStep ? -1 : 1); onStepChange(i) } }}
                    disabled={!isDone && !isActive}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
                      isActive ? 'shadow-md scale-110' : isDone ? 'cursor-pointer' : 'bg-gray-100 text-gray-400'
                    }`}
                    style={(isActive || isDone) ? { backgroundColor: accent, color: onAccent } : undefined}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </button>
                  {i < steps.length - 1 && <div className="flex-1 h-0.5 transition-colors duration-300" style={{ backgroundColor: isDone ? accent : '#e5e7eb' }} />}
                </div>
                <span className={`mt-1.5 text-[9px] font-medium tracking-wide text-center ${isActive ? 'text-gray-900' : 'text-gray-400'} ${isActive ? '' : 'hidden sm:block'}`}>
                  {step.shortLabel}
                </span>
              </div>
            )
          })}
        </div>
        <p className="sm:hidden text-center text-xs font-semibold text-gray-700 mt-2">{steps[currentStep]?.label}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ x: direction >= 0 ? 60 : -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction >= 0 ? -60 : 60, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {children[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button type="button" onClick={goBack} disabled={isFirst}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isFirst ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}>
            <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Indietro</span>
          </button>
          <span className="flex-1 text-center text-xs text-gray-400">{currentStep + 1}/{steps.length}</span>
          <button type="button" onClick={goNext} disabled={completing}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.97] transition-all disabled:opacity-50"
            style={{ backgroundColor: accent, color: onAccent }}>
            {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : isLast ? (
              <>{completeLabel} <Check className="w-4 h-4" /></>
            ) : (
              <>Avanti <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Note: useState imported at top of file
