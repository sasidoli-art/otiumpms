'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, Camera, RotateCcw, ArrowRight } from 'lucide-react'

interface Props {
  token: string
  prenotazione: {
    id: string
    guestNome: string
    guestCognome: string
    guestEmail: string
    dataArrivo: string
    dataPartenza: string | null
    struttura: { nome: string; indirizzo: string | null; citta: string | null } | null
    unita: { nome: string } | null
    host: { nomeAzienda: string } | null
  }
}

type Step = 'intro' | 'fronte' | 'fronte_preview' | 'retro' | 'retro_preview' | 'saving' | 'done'

export function KioskDocs({ token, prenotazione: p }: Props) {
  const [step, setStep] = useState<Step>('intro')
  const [fotoFronte, setFotoFronte] = useState<string | null>(null)
  const [fotoRetro, setFotoRetro] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(10)

  const fronteInputRef = useRef<HTMLInputElement>(null)
  const retroInputRef = useRef<HTMLInputElement>(null)

  // Auto-reset after success
  useEffect(() => {
    if (step !== 'done') return
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          window.location.reload()
          return 10
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step])

  function handleFileCapture(
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'fronte' | 'retro'
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      if (side === 'fronte') {
        setFotoFronte(base64)
        setStep('fronte_preview')
      } else {
        setFotoRetro(base64)
        setStep('retro_preview')
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSave() {
    if (!fotoFronte || !fotoRetro) return
    setStep('saving')
    setError('')

    try {
      const res = await fetch(`/api/checkin/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fotoDocumentoFronte: fotoFronte,
          fotoDocumentoRetro: fotoRetro,
          soloDocumenti: true,
        }),
      })

      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Errore nel salvataggio')
        setStep('retro_preview')
        return
      }

      setStep('done')
    } catch {
      setError('Errore di connessione. Riprova.')
      setStep('retro_preview')
    }
  }

  // Hidden file inputs
  const fileInputs = (
    <>
      <input
        ref={fronteInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFileCapture(e, 'fronte')}
      />
      <input
        ref={retroInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFileCapture(e, 'retro')}
      />
    </>
  )

  // ═══ Success screen ═══
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
        {fileInputs}
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Documenti acquisiti!</h1>
          <p className="text-lg text-gray-500 mb-2">
            Grazie, {p.guestNome}!
          </p>
          <p className="text-sm text-gray-400">
            Questa schermata si resetta tra {countdown} secondi
          </p>
          <div className="mt-6 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ═══ Main kiosk view ═══
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {fileInputs}

      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">
            📄
          </div>
          <div>
            <p className="font-bold text-sm">Otium Week</p>
            <p className="text-[10px] text-slate-400">{p.host?.nomeAzienda}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{p.guestNome} {p.guestCognome}</p>
          <p className="text-[10px] text-slate-400">
            {p.struttura?.nome}{p.unita ? ` · ${p.unita.nome}` : ''}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">

        {error && (
          <div className="w-full mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {/* ═══ INTRO ═══ */}
        {step === 'intro' && (
          <div className="text-center space-y-6 w-full">
            <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
              <Camera className="w-10 h-10 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Acquisizione documenti</h1>
              <p className="text-gray-500 mt-2">
                Scatta una foto del fronte e del retro del documento di identit&agrave;
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-600 space-y-2">
              <p><strong>Ospite:</strong> {p.guestNome} {p.guestCognome}</p>
              <p><strong>Email:</strong> {p.guestEmail}</p>
              {p.struttura && <p><strong>Struttura:</strong> {p.struttura.nome}</p>}
              {p.unita && <p><strong>Camera:</strong> {p.unita.nome}</p>}
            </div>
            <button
              onClick={() => {
                setStep('fronte')
                setTimeout(() => fronteInputRef.current?.click(), 100)
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-3"
            >
              <Camera className="w-5 h-5" /> Inizia acquisizione
            </button>
          </div>
        )}

        {/* ═══ FRONTE CAPTURE ═══ */}
        {step === 'fronte' && (
          <div className="text-center space-y-6 w-full">
            <div>
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-2">Passaggio 1 di 2</p>
              <h1 className="text-2xl font-bold text-gray-900">Foto fronte documento</h1>
              <p className="text-gray-500 mt-2">Posiziona il documento e scatta la foto</p>
            </div>
            <button
              onClick={() => fronteInputRef.current?.click()}
              className="w-full py-16 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              <Camera className="w-12 h-12" />
              <span className="text-lg font-medium">Tocca per scattare</span>
            </button>
          </div>
        )}

        {/* ═══ FRONTE PREVIEW ═══ */}
        {step === 'fronte_preview' && fotoFronte && (
          <div className="text-center space-y-6 w-full">
            <div>
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-2">Passaggio 1 di 2</p>
              <h1 className="text-2xl font-bold text-gray-900">Fronte documento</h1>
              <p className="text-gray-500 mt-2">Verifica che la foto sia leggibile</p>
            </div>
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
              <img src={fotoFronte} alt="Fronte documento" className="w-full h-auto" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFotoFronte(null)
                  setStep('fronte')
                  setTimeout(() => fronteInputRef.current?.click(), 100)
                }}
                className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl text-lg font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> Ripeti
              </button>
              <button
                onClick={() => {
                  setStep('retro')
                  setTimeout(() => retroInputRef.current?.click(), 100)
                }}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                Conferma <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ RETRO CAPTURE ═══ */}
        {step === 'retro' && (
          <div className="text-center space-y-6 w-full">
            <div>
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-2">Passaggio 2 di 2</p>
              <h1 className="text-2xl font-bold text-gray-900">Foto retro documento</h1>
              <p className="text-gray-500 mt-2">Gira il documento e scatta la foto del retro</p>
            </div>
            <button
              onClick={() => retroInputRef.current?.click()}
              className="w-full py-16 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              <Camera className="w-12 h-12" />
              <span className="text-lg font-medium">Tocca per scattare</span>
            </button>
          </div>
        )}

        {/* ═══ RETRO PREVIEW ═══ */}
        {step === 'retro_preview' && fotoRetro && (
          <div className="text-center space-y-6 w-full">
            <div>
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-2">Passaggio 2 di 2</p>
              <h1 className="text-2xl font-bold text-gray-900">Retro documento</h1>
              <p className="text-gray-500 mt-2">Verifica che la foto sia leggibile</p>
            </div>
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
              <img src={fotoRetro} alt="Retro documento" className="w-full h-auto" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFotoRetro(null)
                  setStep('retro')
                  setTimeout(() => retroInputRef.current?.click(), 100)
                }}
                className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl text-lg font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> Ripeti
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> Salva documenti
              </button>
            </div>
          </div>
        )}

        {/* ═══ SAVING ═══ */}
        {step === 'saving' && (
          <div className="text-center space-y-6">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Salvataggio in corso...</h1>
          </div>
        )}
      </div>
    </div>
  )
}
