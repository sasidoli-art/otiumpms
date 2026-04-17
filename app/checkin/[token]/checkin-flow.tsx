'use client'

import { useRef, useReducer, useCallback, useEffect, useState } from 'react'
import { CheckinLayout } from '@/components/checkin/checkin-layout'
import { CheckinStepper, type StepConfig } from '@/components/checkin/checkin-stepper'
import StepDatiPersonali, { type StepDatiPersonaliRef, type DatiPersonaliData } from '@/components/checkin/steps/step-dati-personali'
import StepDocumento, { type StepDocumentoRef, type DocumentoData } from '@/components/checkin/steps/step-documento'
import StepAccompagnatori, { type StepAccompagnatoriRef, type AccompagnatoreForm } from '@/components/checkin/steps/step-accompagnatori'
import StepFirma, { type StepFirmaRef, type FirmaData } from '@/components/checkin/steps/step-firma'
import StepConferma from '@/components/checkin/steps/step-conferma'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CheckInState {
  datiPersonali: Partial<DatiPersonaliData>
  documento: Partial<DocumentoData>
  accompagnatori: AccompagnatoreForm[]
  firma: Partial<FirmaData>
}

type Action =
  | { type: 'SET_DATI'; payload: Partial<DatiPersonaliData> }
  | { type: 'SET_DOCUMENTO'; payload: Partial<DocumentoData> }
  | { type: 'SET_ACCOMPAGNATORI'; payload: AccompagnatoreForm[] }
  | { type: 'SET_FIRMA'; payload: Partial<FirmaData> }

function reducer(state: CheckInState, action: Action): CheckInState {
  switch (action.type) {
    case 'SET_DATI': return { ...state, datiPersonali: { ...state.datiPersonali, ...action.payload } }
    case 'SET_DOCUMENTO': return { ...state, documento: { ...state.documento, ...action.payload } }
    case 'SET_ACCOMPAGNATORI': return { ...state, accompagnatori: action.payload }
    case 'SET_FIRMA': return { ...state, firma: { ...state.firma, ...action.payload } }
  }
}

interface Props {
  token: string
  prenotazione: {
    id: string
    guestNome: string
    guestCognome: string
    guestEmail: string
    guestTelefono: string | null
    guestSesso: string | null
    guestDataNascita: string | null
    guestLuogoNascita: string | null
    guestComuneNascitaIstat: string | null
    guestProvinciaNascita: string | null
    guestStatoNascitaIstat: string | null
    guestCittadinanzaIstat: string | null
    guestCodiceFiscale: string | null
    guestTipoDocumento: string | null
    guestNumeroDocumento: string | null
    guestLuogoRilascio: string | null
    guestComuneRilascioIstat: string | null
    guestProvinciaRilascio: string | null
    fotoDocumentoFronte: string | null
    fotoDocumentoRetro: string | null
    dataArrivo: string
    dataPartenza: string | null
    numOspiti: number
    pin: string | null
    unita: { nome: string } | null
    accompagnatori: {
      nome: string; cognome: string; sesso: string | null
      dataNascita: string | null; luogoNascita: string | null
      provinciaNascita: string | null; tipoDocumento: string | null
      numeroDocumento: string | null; isMinore: boolean
    }[]
    regCardCampiExtra: unknown
  }
  struttura: {
    nome: string
    indirizzo: string | null
    citta: string | null
    logo: string | null
    colorePrimario: string | null
    messaggioChiusura: string | null
  }
  host: {
    nomeAzienda: string
    telefono: string | null
    regCardTerminiHtml: string | null
    regCardPrivacyHtml: string | null
    regCardCampiExtra: Record<string, unknown>[] | null
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CheckinFlow({ token, prenotazione: p, struttura, host }: Props) {
  const accent = struttura.colorePrimario || '#4f46e5'
  const hasAccompagnatori = p.numOspiti > 1

  // Refs per validazione
  const datiRef = useRef<StepDatiPersonaliRef>(null)
  const docRef = useRef<StepDocumentoRef>(null)
  const accRef = useRef<StepAccompagnatoriRef>(null)
  const firmaRef = useRef<StepFirmaRef>(null)

  // State globale check-in
  const [state, dispatch] = useReducer(reducer, {
    datiPersonali: {},
    documento: {},
    accompagnatori: p.accompagnatori.map(a => ({
      nome: a.nome,
      cognome: a.cognome,
      sesso: a.sesso || '',
      giornoNascita: a.dataNascita ? String(new Date(a.dataNascita).getDate()) : '',
      meseNascita: a.dataNascita ? String(new Date(a.dataNascita).getMonth() + 1) : '',
      annoNascita: a.dataNascita ? String(new Date(a.dataNascita).getFullYear()) : '',
      luogoNascita: a.luogoNascita || '',
      provinciaNascita: a.provinciaNascita || '',
      isMinore: a.isMinore,
      tipoDocumento: a.tipoDocumento || '',
      numeroDocumento: a.numeroDocumento || '',
    })),
    firma: {},
  })

  // ─── Persistenza localStorage ──────────────────────────────────────────
  const STORAGE_KEY = `checkin-${token}`
  const [savedStep, setSavedStep] = useState<number | null>(null)
  const [showResume, setShowResume] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Check localStorage al mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { step: number; state: CheckInState }
        if (saved.step > 0) {
          setSavedStep(saved.step)
          setShowResume(true)
        }
      }
    } catch { /* ignore */ }
  }, [STORAGE_KEY])

  // Salva state ad ogni cambio
  useEffect(() => {
    if (completed) return
    try {
      // Non salviamo le foto (troppo pesanti per localStorage)
      const toSave = {
        ...state,
        documento: { ...state.documento, fotoDocumentoFronte: null, fotoDocumentoRetro: null },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 0, state: toSave }))
    } catch { /* quota exceeded, ignore */ }
  }, [state, STORAGE_KEY, completed])

  function resumeFromSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { step: number; state: CheckInState }
        if (saved.state.datiPersonali) dispatch({ type: 'SET_DATI', payload: saved.state.datiPersonali })
        if (saved.state.documento) dispatch({ type: 'SET_DOCUMENTO', payload: saved.state.documento })
        if (saved.state.accompagnatori?.length) dispatch({ type: 'SET_ACCOMPAGNATORI', payload: saved.state.accompagnatori })
        if (saved.state.firma) dispatch({ type: 'SET_FIRMA', payload: saved.state.firma })
      }
    } catch { /* ignore */ }
    setShowResume(false)
  }

  function startFresh() {
    localStorage.removeItem(STORAGE_KEY)
    setShowResume(false)
  }

  function clearStorage() {
    localStorage.removeItem(STORAGE_KEY)
    setCompleted(true)
  }

  // ─── Step config ────────────────────────────────────────────────────────
  const steps: StepConfig[] = [
    { id: 'dati', label: 'Dati personali', shortLabel: 'Dati', validate: () => datiRef.current?.validate() ?? false },
    { id: 'documento', label: 'Documento', shortLabel: 'Doc', validate: () => docRef.current?.validate() ?? false },
    ...(hasAccompagnatori
      ? [{ id: 'accompagnatori', label: 'Accompagnatori', shortLabel: 'Acc.', validate: () => accRef.current?.validate() ?? false }]
      : []),
    { id: 'firma', label: 'Firma', validate: () => firmaRef.current?.validate() ?? false },
    { id: 'conferma', label: 'Conferma' },
  ]

  // ─── Build submit data ──────────────────────────────────────────────────
  const buildCheckInData = useCallback((): Record<string, unknown> => {
    const d = state.datiPersonali
    const doc = state.documento

    // Ricostruisci data nascita da giorno/mese/anno
    let guestDataNascita: string | null = null
    if (d.guestGiornoNascita && d.guestMeseNascita && d.guestAnnoNascita) {
      guestDataNascita = `${d.guestAnnoNascita}-${String(d.guestMeseNascita).padStart(2, '0')}-${String(d.guestGiornoNascita).padStart(2, '0')}`
    }

    // Accompagnatori: ricostruisci date
    const accompagnatori = state.accompagnatori.map(a => ({
      nome: a.nome,
      cognome: a.cognome,
      sesso: a.sesso || null,
      dataNascita: a.giornoNascita && a.meseNascita && a.annoNascita
        ? `${a.annoNascita}-${String(a.meseNascita).padStart(2, '0')}-${String(a.giornoNascita).padStart(2, '0')}`
        : null,
      luogoNascita: a.luogoNascita || null,
      provinciaNascita: a.provinciaNascita || null,
      tipoDocumento: a.tipoDocumento || null,
      numeroDocumento: a.numeroDocumento || null,
      isMinore: a.isMinore,
    }))

    return {
      guestNome: d.guestNome || p.guestNome,
      guestCognome: d.guestCognome || p.guestCognome,
      guestTelefono: d.guestTelefono || p.guestTelefono,
      guestSesso: d.guestSesso || null,
      guestDataNascita,
      guestLuogoNascita: d.guestLuogoNascita || null,
      guestComuneNascitaIstat: d.guestComuneNascitaIstat || null,
      guestProvinciaNascita: d.guestProvinciaNascita || null,
      guestStatoNascitaIstat: d.guestStatoNascitaIstat || '100000100',
      guestCittadinanzaIstat: d.guestCittadinanzaIstat || '100000100',
      guestCodiceFiscale: d.guestCodiceFiscale || null,
      guestTipoDocumento: doc.guestTipoDocumento || null,
      guestNumeroDocumento: doc.guestNumeroDocumento || null,
      guestLuogoRilascio: doc.guestLuogoRilascio || null,
      guestComuneRilascioIstat: doc.guestComuneRilascioIstat || null,
      guestProvinciaRilascio: doc.guestProvinciaRilascio || null,
      fotoDocumentoFronte: doc.fotoDocumentoFronte || null,
      fotoDocumentoRetro: doc.fotoDocumentoRetro || null,
      accompagnatori,
      firmaBase64: state.firma.firmaBase64 || null,
      accTermini: state.firma.accTermini || false,
      accPrivacy: state.firma.accPrivacy || false,
      accMarketing: state.firma.accMarketing || false,
    }
  }, [state, p])

  const handleComplete = useCallback(() => {
    clearStorage()
  }, [])

  // ─── Resume dialog ──────────────────────────────────────────────────────
  if (showResume) {
    return (
      <CheckinLayout strutturaNome={struttura.nome} logo={struttura.logo} colorePrimario={struttura.colorePrimario} hostNome={host.nomeAzienda}>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <p className="text-3xl mb-4">📝</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Vuoi riprendere da dove eri rimasto?</h2>
          <p className="text-sm text-gray-500 mb-6">Abbiamo trovato dati salvati dal tuo ultimo tentativo.</p>
          <div className="flex gap-3">
            <button onClick={resumeFromSaved}
              className="px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-md"
              style={{ backgroundColor: accent }}>
              Riprendi
            </button>
            <button onClick={startFresh}
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50">
              Ricomincia
            </button>
          </div>
        </div>
      </CheckinLayout>
    )
  }

  return (
    <CheckinLayout
      strutturaNome={struttura.nome}
      logo={struttura.logo}
      colorePrimario={struttura.colorePrimario}
      hostNome={host.nomeAzienda}
    >
      <CheckinStepper
        steps={steps}
        onComplete={handleComplete}
        accentColor={accent}
        completeLabel="Vai alla conferma"
      >
        {/* Step 1: Dati personali */}
        <StepDatiPersonali
          ref={datiRef}
          prenotazione={p}
          onChange={data => dispatch({ type: 'SET_DATI', payload: data })}
          accentColor={accent}
        />

        {/* Step 2: Documento */}
        <StepDocumento
          ref={docRef}
          prenotazione={p}
          onChange={data => dispatch({ type: 'SET_DOCUMENTO', payload: data })}
          accentColor={accent}
        />

        {/* Step 3: Accompagnatori (condizionale) */}
        {hasAccompagnatori && (
          <StepAccompagnatori
            ref={accRef}
            numOspiti={p.numOspiti}
            accompagnatori={state.accompagnatori}
            onChange={accs => dispatch({ type: 'SET_ACCOMPAGNATORI', payload: accs })}
            accentColor={accent}
          />
        )}

        {/* Step 4: Firma */}
        <StepFirma
          ref={firmaRef}
          prenotazione={{
            guestNome: p.guestNome,
            guestCognome: p.guestCognome,
            dataArrivo: p.dataArrivo,
            dataPartenza: p.dataPartenza,
            numOspiti: p.numOspiti,
            unitaNome: p.unita?.nome,
            strutturaNome: struttura.nome,
          }}
          accompagnatori={state.accompagnatori.filter(a => a.nome)}
          regCardTerminiHtml={host.regCardTerminiHtml}
          regCardPrivacyHtml={host.regCardPrivacyHtml}
          regCardCampiExtra={host.regCardCampiExtra as { label: string; type: 'text' | 'checkbox' | 'select'; required?: boolean; options?: string[] }[] | null}
          onChange={data => dispatch({ type: 'SET_FIRMA', payload: data })}
          accentColor={accent}
        />

        {/* Step 5: Conferma + Submit */}
        <StepConferma
          token={token}
          checkInData={buildCheckInData()}
          prenotazione={{
            guestNome: p.guestNome,
            guestCognome: p.guestCognome,
            dataArrivo: p.dataArrivo,
            dataPartenza: p.dataPartenza,
            numOspiti: p.numOspiti,
            unitaNome: p.unita?.nome,
            strutturaNome: struttura.nome,
            pin: p.pin,
          }}
          accompagnatori={state.accompagnatori.filter(a => a.nome)}
          hostTelefono={host.telefono}
          accentColor={accent}
        />
      </CheckinStepper>
    </CheckinLayout>
  )
}
