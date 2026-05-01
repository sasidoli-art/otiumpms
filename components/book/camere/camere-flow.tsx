'use client'

import { useState } from 'react'
import StepDateCamere, { type UnitaDisponibile } from './step-date-camere'
import StepDatiOspite, { type GuestData, type ConsensiData } from './step-dati-ospite'
import StepConferma from './step-conferma'
import BookingStepper from '@/components/book/booking-stepper'

export type SelezioneCamera = {
  arrivo: Date
  partenza: Date
  adulti: number
  bambini: number
  etaBambini: number[]
  unita: UnitaDisponibile
  lettoExtra: boolean
}

type Props = {
  strutturaId: string
  strutturaNome: string
  strutturaIndirizzo: string | null
  strutturaTelefono: string | null
  moduloSpaAttivo: boolean
  cancellazionePolicy: string | null
  capacitaMax: number
}

const STEPS = ['Date e camere', 'I tuoi dati', 'Conferma'] as const

export default function CamereFlow({
  strutturaId, strutturaNome, strutturaIndirizzo, strutturaTelefono,
  moduloSpaAttivo, cancellazionePolicy, capacitaMax,
}: Props) {
  const [step, setStep] = useState(0)
  const [sel, setSel] = useState<SelezioneCamera | null>(null)
  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [consensi, setConsensi] = useState<ConsensiData | null>(null)
  const [completato, setCompletato] = useState(false)

  return (
    <div>
      {!completato && (
        <BookingStepper
          steps={STEPS}
          currentStep={step}
          onBack={() => setStep((s) => Math.max(0, s - 1) as 0 | 1 | 2)}
          className="mb-6"
        />
      )}

      {/* Step 1 */}
      {step === 0 && (
        <StepDateCamere
          strutturaId={strutturaId}
          capacitaMax={capacitaMax}
          onConferma={(s) => {
            setSel(s)
            setStep(1)
          }}
        />
      )}

      {/* Step 2 */}
      {step === 1 && sel && (
        <StepDatiOspite
          onAvanti={({ guestData: g, consensi: c }) => {
            setGuestData(g)
            setConsensi(c)
            setStep(2)
          }}
        />
      )}

      {/* Step 3 */}
      {step === 2 && sel && guestData && consensi && (
        <StepConferma
          strutturaId={strutturaId}
          strutturaNome={strutturaNome}
          strutturaIndirizzo={strutturaIndirizzo}
          strutturaTelefono={strutturaTelefono}
          moduloSpaAttivo={moduloSpaAttivo}
          cancellazionePolicy={cancellazionePolicy}
          sel={sel}
          guest={guestData}
          consensi={consensi}
          onModifica={(s) => {
            setStep(s)
            setCompletato(false)
          }}
        />
      )}
    </div>
  )
}

