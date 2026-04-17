'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export interface StepConfig {
  id: string
  label: string
  /** Optional: icon shown on mobile instead of label */
  shortLabel?: string
  /** Called before advancing — return false to block, string for error */
  validate?: () => boolean | string
}

interface CheckinStepperProps {
  steps: StepConfig[]
  children: ReactNode[]
  /** Called when the user completes the last step */
  onComplete: () => void | Promise<void>
  /** Resume from a previous step (0-based) */
  initialStep?: number
  /** Label for the final "Complete" button */
  completeLabel?: string
  /** Loading state for async completion */
  completing?: boolean
  /** Accent color (hex, defaults to indigo-600) */
  accentColor?: string
}

export function CheckinStepper({
  steps,
  children,
  onComplete,
  initialStep = 0,
  completeLabel = 'Conferma check-in',
  completing = false,
  accentColor,
}: CheckinStepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [direction, setDirection] = useState(0) // -1 = back, 1 = forward
  const [error, setError] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    () => new Set(Array.from({ length: initialStep }, (_, i) => i))
  )

  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0
  const accent = accentColor || '#4f46e5'

  const goNext = useCallback(() => {
    setError(null)
    const step = steps[currentStep]
    if (step.validate) {
      const result = step.validate()
      if (result === false) {
        setError('Completa tutti i campi obbligatori')
        return
      }
      if (typeof result === 'string') {
        setError(result)
        return
      }
    }
    setCompletedSteps(prev => new Set(prev).add(currentStep))
    if (isLastStep) {
      onComplete()
    } else {
      setDirection(1)
      setCurrentStep(s => s + 1)
    }
  }, [currentStep, isLastStep, onComplete, steps])

  const goBack = useCallback(() => {
    if (isFirstStep) return
    setError(null)
    setDirection(-1)
    setCurrentStep(s => s - 1)
  }, [isFirstStep])

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      {/* ─── Stepper indicator ─────────────────────────────────────────── */}
      <div className="px-4 py-5">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {steps.map((step, i) => {
            const isActive = i === currentStep
            const isCompleted = completedSteps.has(i)
            const isPast = i < currentStep

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                {/* Connector line (not on first) */}
                <div className="flex items-center w-full">
                  {i > 0 && (
                    <div
                      className="flex-1 h-0.5 transition-colors duration-300"
                      style={{ backgroundColor: isPast || isCompleted ? accent : '#e5e7eb' }}
                    />
                  )}

                  {/* Circle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isPast || isCompleted) {
                        setDirection(i < currentStep ? -1 : 1)
                        setCurrentStep(i)
                        setError(null)
                      }
                    }}
                    disabled={!isPast && !isCompleted && !isActive}
                    className={`
                      relative w-9 h-9 rounded-full flex items-center justify-center
                      text-xs font-bold transition-all duration-300 shrink-0
                      ${isActive
                        ? 'text-white shadow-lg scale-110'
                        : isCompleted
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-400'
                      }
                      ${(isPast || isCompleted) && !isActive ? 'cursor-pointer hover:scale-105' : ''}
                    `}
                    style={{
                      backgroundColor: isActive || isCompleted ? accent : undefined,
                    }}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </button>

                  {i < steps.length - 1 && (
                    <div
                      className="flex-1 h-0.5 transition-colors duration-300"
                      style={{ backgroundColor: isPast || isCompleted ? accent : '#e5e7eb' }}
                    />
                  )}
                </div>

                {/* Label — desktop only, mobile shows only active */}
                <span
                  className={`
                    mt-2 text-[10px] font-medium tracking-wide text-center leading-tight
                    transition-colors duration-300
                    ${isActive ? 'text-gray-900' : 'text-gray-400'}
                    ${isActive ? '' : 'hidden sm:block'}
                  `}
                >
                  {step.shortLabel || step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Mobile: current step label */}
        <p className="sm:hidden text-center text-xs font-semibold text-gray-700 mt-3">
          {steps[currentStep]?.label}
        </p>
      </div>

      {/* ─── Step content with slide animation ─────────────────────────── */}
      <div className="flex-1 overflow-hidden px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ x: direction >= 0 ? 80 : -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction >= 0 ? -80 : 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {children[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Error message ────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
          {error}
        </div>
      )}

      {/* ─── Sticky footer navigation ─────────────────────────────────── */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={goBack}
            disabled={isFirstStep}
            className={`
              flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium
              transition-all duration-200
              ${isFirstStep
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100 active:scale-[0.97]'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Indietro</span>
          </button>

          {/* Progress text */}
          <div className="flex-1 text-center">
            <span className="text-xs text-gray-400">
              {currentStep + 1} di {steps.length}
            </span>
          </div>

          {/* Next / Complete button */}
          <button
            type="button"
            onClick={goNext}
            disabled={completing}
            className="flex items-center gap-1.5 px-6 py-3 rounded-xl text-sm font-semibold text-white
                       shadow-md hover:shadow-lg hover:-translate-y-0.5
                       active:scale-[0.97] transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: accent }}
          >
            {completing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLastStep ? (
              <>
                {completeLabel}
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Avanti
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
