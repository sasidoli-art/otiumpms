'use client'

import { useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { SpaBookingLayout } from '@/components/spa/booking/spa-booking-layout'
import {
  SpaBookingStepper, spaBookingReducer, initialSpaBookingState,
  type SpaBookingState, type SpaBookingAction, type SpaStepConfig,
} from '@/components/spa/booking/spa-booking-stepper'
import StepServizio, { type Trattamento, type Percorso } from '@/components/spa/booking/steps/step-servizio'
import StepSlot from '@/components/spa/booking/steps/step-slot'
import StepDatiWaiver, { type StepDatiWaiverRef } from '@/components/spa/booking/steps/step-dati-waiver'
import StepPagamentoConferma from '@/components/spa/booking/steps/step-pagamento-conferma'

interface Terapista {
  id: string; nome: string; cognome: string; bio: string | null; specializzazioni: string[]; colore: string
}

interface Props {
  strutturaId: string
  struttura: {
    nome: string; logo: string | null; colorePrimario: string | null
    telefono: string | null; regCardSpaTerminiHtml: string | null
  }
  trattamenti: Trattamento[]
  percorsi: Percorso[]
  terapisti: Terapista[]
  prenotazioneGuest: {
    nome: string; cognome: string; email: string; telefono: string | null
    prenotazioneId: string; unitaNome: string | null; unitaId: string | null
  } | null
}

export default function SpaBookingFlow({
  strutturaId, struttura, trattamenti, percorsi, terapisti, prenotazioneGuest,
}: Props) {
  const accent = struttura.colorePrimario || '#4f46e5'
  const STORAGE_KEY = `spa-booking-${strutturaId}`

  const [state, dispatch] = useReducer(spaBookingReducer, initialSpaBookingState)
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)
  const waiverRef = useRef<StepDatiWaiverRef>(null)

  // Restore from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as SpaBookingState & { currentStep: number }
        dispatch({ type: 'RESTORE', payload: saved })
        if (saved.step > 0) setCurrentStep(saved.step)
      }
    } catch {}
  }, [STORAGE_KEY])

  // Persist to sessionStorage
  useEffect(() => {
    if (completed) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, step: currentStep, currentStep }))
    } catch {}
  }, [state, currentStep, STORAGE_KEY, completed])

  const clearStorage = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setCompleted(true)
  }, [STORAGE_KEY])

  const servizio = state.trattamento || state.percorso
  const summary = {
    servizioNome: servizio?.nome,
    prezzo: servizio?.prezzo,
    durata: servizio?.durata,
    data: state.slot?.data,
    oraInizio: state.slot?.oraInizio,
  }

  const steps: SpaStepConfig[] = [
    { id: 'servizio', label: 'Scegli trattamento', shortLabel: 'Servizio', validate: () => !!(state.trattamento || state.percorso) },
    { id: 'slot', label: 'Data e orario', shortLabel: 'Orario', validate: () => !!state.slot },
    { id: 'dati', label: 'I tuoi dati', shortLabel: 'Dati', validate: () => waiverRef.current?.validate() ?? false },
    { id: 'conferma', label: 'Conferma', shortLabel: 'Conferma' },
  ]

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step)
    dispatch({ type: 'SET_STEP', payload: step })
  }, [])

  const handleReset = useCallback(() => {
    clearStorage()
    window.location.reload()
  }, [clearStorage])

  return (
    <SpaBookingLayout
      strutturaNome={struttura.nome}
      logo={struttura.logo}
      colorePrimario={struttura.colorePrimario}
      summary={summary}
    >
      <SpaBookingStepper
        steps={steps}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onComplete={() => { /* conferma gestita internamente da step 4 */ }}
        accentColor={accent}
        completeLabel="Vai al pagamento"
      >
        {/* Step 1: Servizio */}
        <StepServizio
          trattamenti={trattamenti}
          percorsi={percorsi}
          selectedTrattamento={state.trattamento}
          selectedPercorso={state.percorso}
          onSelectTrattamento={t => dispatch({ type: 'SET_TRATTAMENTO', payload: { id: t.id, nome: t.nome, durata: t.durata, prezzo: t.prezzo } })}
          onSelectPercorso={p => dispatch({ type: 'SET_PERCORSO', payload: { id: p.id, nome: p.nome, durata: p.durataMinuti, prezzo: p.prezzo } })}
          accentColor={accent}
          strutturaTelefono={struttura.telefono}
        />

        {/* Step 2: Slot */}
        <StepSlot
          strutturaId={strutturaId}
          trattamentoId={state.trattamento?.id}
          percorsoId={state.percorso?.id}
          durata={servizio?.durata ?? 60}
          selectedSlot={state.slot}
          onSelectSlot={slot => dispatch({ type: 'SET_SLOT', payload: slot })}
          terapisti={terapisti}
          accentColor={accent}
        />

        {/* Step 3: Dati + Waiver */}
        <StepDatiWaiver
          ref={waiverRef}
          prenotazioneGuest={prenotazioneGuest ? { nome: prenotazioneGuest.nome, cognome: prenotazioneGuest.cognome, email: prenotazioneGuest.email, telefono: prenotazioneGuest.telefono } : null}
          categoriaTrattamento={trattamenti.find(t => t.id === state.trattamento?.id)?.categoria}
          regCardSpaTerminiHtml={struttura.regCardSpaTerminiHtml}
          onChange={({ guest, waiver }) => {
            dispatch({ type: 'SET_GUEST', payload: guest })
            dispatch({ type: 'SET_WAIVER', payload: waiver as unknown as Record<string, unknown> })
          }}
          accentColor={accent}
        />

        {/* Step 4: Pagamento + Conferma */}
        <StepPagamentoConferma
          strutturaId={strutturaId}
          strutturaNome={struttura.nome}
          trattamento={state.trattamento}
          percorso={state.percorso}
          slot={state.slot}
          guest={state.guest}
          waiver={state.waiver as Record<string, unknown> | null}
          prenotazioneId={prenotazioneGuest?.prenotazioneId}
          unitaNome={prenotazioneGuest?.unitaNome}
          unitaId={prenotazioneGuest?.unitaId}
          onGoToStep={handleStepChange}
          onReset={handleReset}
          accentColor={accent}
          hostTelefono={struttura.telefono}
        />
      </SpaBookingStepper>
    </SpaBookingLayout>
  )
}
