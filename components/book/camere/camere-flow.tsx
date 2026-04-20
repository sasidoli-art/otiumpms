'use client'

import { useState } from 'react'
import { Check, ArrowLeft } from 'lucide-react'
import StepDateCamere, { type UnitaDisponibile } from './step-date-camere'
import StepDatiOspite, { type GuestData, type ConsensiData } from './step-dati-ospite'

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
  capacitaMax: number
}

const STEPS = ['Date e camere', 'I tuoi dati', 'Conferma'] as const

export default function CamereFlow({ strutturaId, capacitaMax }: Props) {
  const [step, setStep] = useState(0)
  const [sel, setSel] = useState<SelezioneCamera | null>(null)
  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [consensi, setConsensi] = useState<ConsensiData | null>(null)

  return (
    <div>
      {/* Stepper header */}
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
                      active
                        ? 'text-white'
                        : done
                          ? 'text-white border-transparent'
                          : 'text-gray-400 border-gray-200 bg-white'
                    }`}
                    style={
                      active || done
                        ? { backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' }
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
                  <div className={`flex-1 h-0.5 mx-2 md:mx-3 ${done ? '' : 'bg-gray-200'}`} style={done ? { backgroundColor: 'var(--brand-primary)' } : undefined} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Back button (step > 0) */}
      {step > 0 && (
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Indietro
        </button>
      )}

      {/* Step content */}
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

      {step === 1 && sel && (
        <StepDatiOspite
          onAvanti={({ guestData: g, consensi: c }) => {
            setGuestData(g)
            setConsensi(c)
            setStep(2)
          }}
        />
      )}

      {step === 2 && sel && guestData && consensi && (
        <PlaceholderStep
          titolo="Conferma"
          descrizione={`Riepilogo prenotazione per ${guestData.nome} ${guestData.cognome} (${guestData.email}) + submit → POST /api/book/[strutturaId] + registraConsenso per tos/privacy/marketing. Implementazione nel prossimo step.`}
          sel={sel}
          onAvanti={() => { /* submit API */ }}
          submitLabel="Conferma prenotazione"
        />
      )}
    </div>
  )
}

function PlaceholderStep({
  titolo, descrizione, sel, onAvanti, submitLabel,
}: {
  titolo: string
  descrizione: string
  sel: SelezioneCamera
  onAvanti: () => void
  submitLabel?: string
}) {
  const notti = Math.round((sel.partenza.getTime() - sel.arrivo.getTime()) / 86400000)
  const prezzoExtra = sel.lettoExtra && sel.unita.prezzoLettoExtra ? sel.unita.prezzoLettoExtra * notti : 0
  const totale = (sel.unita.prezzoTotaleScontato ?? sel.unita.prezzoTotale) + prezzoExtra

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-2">{titolo}</h2>
      <p className="text-sm text-gray-500 mb-6">{descrizione}</p>

      {/* Riepilogo selezione */}
      <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm">
        <p className="font-semibold text-gray-900">{sel.unita.nome}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {notti} {notti === 1 ? 'notte' : 'notti'} · {sel.adulti + sel.bambini} ospiti
        </p>
        <p className="text-lg font-bold mt-2" style={{ color: 'var(--brand-primary)' }}>
          €{totale.toFixed(0)}
        </p>
      </div>

      <button
        onClick={onAvanti}
        className="w-full py-3 rounded-lg text-sm font-semibold text-white hover:brightness-110 transition-all"
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        {submitLabel ?? 'Continua'}
      </button>
    </div>
  )
}
