'use client'

import { useState } from 'react'
import { Check, ArrowLeft } from 'lucide-react'
import StepPrenotazione, { type RistoranteSel } from './step-prenotazione'
import StepDatiConferma from './step-dati-conferma'

type Props = {
  strutturaId: string
  prefill?: {
    nome?: string | null
    cognome?: string | null
    email?: string | null
    telefono?: string | null
    pin?: string | null
  } | null
}

const STEPS = ['Data e orario', 'Dati e conferma'] as const

export default function RistoranteFlow({ strutturaId, prefill }: Props) {
  const [step, setStep] = useState<0 | 1>(0)
  const [sel, setSel] = useState<RistoranteSel | null>(null)

  return (
    <div className="max-w-xl mx-auto">
      {/* Stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((label, i) => {
            const active = i === step
            const done = i < step
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
                  >
                    {done ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] md:text-xs mt-1 font-medium ${active ? 'text-gray-900' : 'text-gray-500'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 md:mx-3 ${done ? '' : 'bg-gray-200'}`}
                    style={done ? { backgroundColor: 'var(--brand-primary)' } : undefined}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {step === 1 && (
        <button
          type="button"
          onClick={() => setStep(0)}
          className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Modifica data/orario
        </button>
      )}

      {step === 0 && (
        <StepPrenotazione
          strutturaId={strutturaId}
          onAvanti={(s) => { setSel(s); setStep(1) }}
        />
      )}

      {step === 1 && sel && (
        <StepDatiConferma
          strutturaId={strutturaId}
          sel={sel}
          prefill={prefill ?? null}
        />
      )}
    </div>
  )
}
