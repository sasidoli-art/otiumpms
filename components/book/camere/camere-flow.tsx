'use client'

import { useState } from 'react'
import { Check, ArrowLeft } from 'lucide-react'
import StepDateCamere, { type UnitaDisponibile } from './step-date-camere'
import StepDatiOspite, { type GuestData, type ConsensiData } from './step-dati-ospite'
import StepConferma from './step-conferma'

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
      {/* Stepper header (nascosto dopo submit finale) */}
      {!completato && (
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
                    <span className={`text-[10px] md:text-xs mt-1 font-medium text-center ${active ? 'text-gray-900' : 'text-gray-500'}`}>
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
      )}

      {/* Back button */}
      {step > 0 && !completato && (
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1) as 0 | 1 | 2)}
          className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Indietro
        </button>
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

