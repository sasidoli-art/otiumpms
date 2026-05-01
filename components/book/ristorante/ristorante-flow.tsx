'use client'

import { useState } from 'react'
import StepPrenotazione, { type RistoranteSel } from './step-prenotazione'
import StepDatiConferma from './step-dati-conferma'
import BookingStepper from '@/components/book/booking-stepper'

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
      <BookingStepper
        steps={STEPS}
        currentStep={step}
        onBack={() => setStep(0)}
        backLabel="Modifica data/orario"
        className="mb-6"
      />

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
