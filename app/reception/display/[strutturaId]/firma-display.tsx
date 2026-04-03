'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Clock, Euro, Users, BedDouble, Receipt } from 'lucide-react'
import { SignaturePad } from '@/components/spa/signature-pad'
import QRCode from 'qrcode'

type DisplayData = {
  stato: 'idle' | 'attivo'
  struttura: { nome: string; logo: string | null; colorePrimario: string | null; messaggioChiusura: string | null }
  prenotazione?: {
    id: string
    guestNome: string
    camera: string | null
    notti: number
    numOspiti: number
    prezzoSoggiorno: number
    totaleExtra: number
    tassaTotale: number
    acconto: number
    totale: number
    saldo: number
    addebiti: { descrizione: string; totale: number }[]
    firmaUrl: string | null
    regCardFirmata: boolean
  }
}

type Step = 'conto' | 'condizioni' | 'firma' | 'completato'

export default function FirmaDisplay({
  strutturaId,
  strutturaNome,
  logo,
  colore,
  messaggio,
}: {
  strutturaId: string
  strutturaNome: string
  logo: string | null
  colore: string
  messaggio: string | null
}) {
  const [data, setData] = useState<DisplayData | null>(null)
  const [step, setStep] = useState<Step>('conto')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [firmata, setFirmata] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Poll every 2 seconds
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/host/firma-display?strutturaId=${strutturaId}`)
      if (res.ok) {
        const d: DisplayData = await res.json()
        setData(d)

        // Reset to conto when new prenotazione arrives
        if (d.stato === 'attivo' && d.prenotazione && !firmata) {
          if (d.prenotazione.regCardFirmata) {
            setStep('completato')
            setFirmata(true)
          }
        }

        // Generate QR if firma URL available
        if (d.stato === 'attivo' && d.prenotazione?.firmaUrl && !qrDataUrl) {
          const url = await QRCode.toDataURL(d.prenotazione.firmaUrl, { width: 200, margin: 2 })
          setQrDataUrl(url)
        }

        // If went idle, reset
        if (d.stato === 'idle') {
          setStep('conto')
          setQrDataUrl(null)
          setFirmata(false)
          setCountdown(0)
        }
      }
    } catch { /* polling error, retry */ }
  }, [strutturaId, firmata, qrDataUrl])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [poll])

  // Countdown after completato → reset to idle
  useEffect(() => {
    if (step !== 'completato') return
    setCountdown(8)
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer)
          // Reset display
          fetch(`/api/host/firma-display`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strutturaId, reset: true }),
          })
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step, strutturaId])

  // Handle direct signature on tablet
  async function handleSignature(base64: string) {
    if (!data?.prenotazione) return
    const token = data.prenotazione.firmaUrl?.split('/kiosk/')?.[1]?.split('?')[0]
    if (!token) return

    await fetch(`/api/kiosk/${token}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'checkin',
        firmaBase64: base64,
        accettazioneTermini: true,
        accettazionePrivacy: true,
      }),
    })
    setStep('completato')
    setFirmata(true)
  }

  const pren = data?.prenotazione
  const isIdle = !data || data.stato === 'idle'

  // ─── IDLE STATE ───────────────────────────────────────────
  if (isIdle) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colore}15, ${colore}05)` }}>
        <div className="text-center space-y-6 animate-fadeIn">
          {logo ? (
            <img src={logo} alt={strutturaNome} className="h-20 mx-auto" />
          ) : (
            <h1 className="text-4xl font-heading font-bold" style={{ color: colore }}>{strutturaNome}</h1>
          )}
          <p className="text-xl text-gray-400 font-light">Benvenuti</p>
          {messaggio && <p className="text-sm text-gray-300 italic">{messaggio}</p>}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Display attivo
          </div>
        </div>
      </div>
    )
  }

  // ─── COMPLETATO ───────────────────────────────────────────
  if (step === 'completato' && pren) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center space-y-6 animate-fadeIn">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">Grazie, {pren.guestNome.split(' ')[0]}!</h1>
          <p className="text-lg text-gray-500">La registrazione è stata completata con successo.</p>
          {messaggio && <p className="text-sm text-gray-400 italic">{messaggio}</p>}
          {countdown > 0 && (
            <p className="text-xs text-gray-300">Ritorno alla schermata iniziale tra {countdown}s</p>
          )}
        </div>
      </div>
    )
  }

  if (!pren) return null

  // ─── STEP: CONTO ──────────────────────────────────────────
  if (step === 'conto') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, ${colore}08, white)` }}>
        {/* Header */}
        <div className="p-6 text-center">
          {logo ? <img src={logo} alt="" className="h-12 mx-auto mb-2" /> : null}
          <h1 className="text-2xl font-heading font-bold text-gray-900">{pren.guestNome}</h1>
          <p className="text-sm text-gray-400">{pren.camera && `Camera ${pren.camera} · `}{pren.notti} notti · {pren.numOspiti} ospiti</p>
        </div>

        {/* Conto */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-4">
            <h2 className="text-lg font-heading font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5" style={{ color: colore }} /> Riepilogo conto
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600 flex items-center gap-2"><BedDouble className="w-4 h-4 text-gray-400" /> Soggiorno</span>
                <span className="font-semibold">€{pren.prezzoSoggiorno.toFixed(2)}</span>
              </div>

              {pren.addebiti.map((a, i) => (
                <div key={i} className="flex justify-between py-1.5 text-gray-500">
                  <span>{a.descrizione}</span>
                  <span>€{a.totale.toFixed(2)}</span>
                </div>
              ))}

              {pren.tassaTotale > 0 && (
                <div className="flex justify-between py-1.5 text-gray-500">
                  <span>Tassa di soggiorno</span>
                  <span>€{pren.tassaTotale.toFixed(2)}</span>
                </div>
              )}

              {pren.acconto > 0 && (
                <div className="flex justify-between py-1.5 text-green-600">
                  <span>Acconto versato</span>
                  <span>-€{pren.acconto.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between py-3 border-t-2 border-gray-200 text-lg font-bold">
                <span>Saldo</span>
                <span style={{ color: pren.saldo > 0 ? '#dc2626' : '#16a34a' }}>
                  {pren.saldo > 0 ? `€${pren.saldo.toFixed(2)}` : 'SALDATO'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottone avanti */}
        <div className="p-8 text-center">
          <button
            onClick={() => setStep('condizioni')}
            className="px-12 py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all hover:shadow-xl active:scale-95"
            style={{ background: colore }}
          >
            Continua
          </button>
        </div>
      </div>
    )
  }

  // ─── STEP: CONDIZIONI ─────────────────────────────────────
  if (step === 'condizioni') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, ${colore}08, white)` }}>
        <div className="p-6 text-center">
          <h1 className="text-xl font-heading font-bold text-gray-900">Condizioni e Privacy</h1>
          <p className="text-sm text-gray-400">{pren.guestNome}</p>
        </div>

        <div className="flex-1 px-8 overflow-y-auto">
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-6 text-xs text-gray-600 leading-relaxed max-h-[50vh] overflow-y-auto">
            <p className="font-bold text-sm mb-3">Condizioni generali del soggiorno</p>
            <p>Con la firma della presente Registration Card, il sottoscritto ospite conferma di aver preso visione e di accettare le condizioni generali della struttura, l&apos;informativa sulla privacy ai sensi del GDPR (Reg. UE 2016/679) e autorizza il trattamento dei dati personali per le finalità connesse al soggiorno.</p>
            <p className="mt-3">I dati personali saranno conservati per il periodo previsto dalla normativa vigente (Art. 109 TULPS) e successivamente anonimizzati.</p>
          </div>
        </div>

        <div className="p-8 flex gap-4 justify-center">
          <button onClick={() => setStep('conto')} className="px-8 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold">
            Indietro
          </button>
          <button
            onClick={() => setStep('firma')}
            className="px-12 py-4 rounded-2xl text-white font-bold text-lg shadow-lg"
            style={{ background: colore }}
          >
            Accetto e proseguo
          </button>
        </div>
      </div>
    )
  }

  // ─── STEP: FIRMA ──────────────────────────────────────────
  if (step === 'firma') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, ${colore}08, white)` }}>
        <div className="p-6 text-center">
          <h1 className="text-xl font-heading font-bold text-gray-900">Firma</h1>
          <p className="text-sm text-gray-400">{pren.guestNome}</p>
        </div>

        <div className="flex-1 px-8 flex items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
            {/* QR Code — firma su telefono */}
            {qrDataUrl && (
              <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center gap-4">
                <p className="text-sm font-bold text-gray-700">Scansiona col telefono</p>
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                <p className="text-xs text-gray-400 text-center">
                  Inquadra il QR code con la fotocamera del tuo telefono per firmare
                </p>
              </div>
            )}

            {/* Firma diretta su tablet */}
            <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-4">
              <p className="text-sm font-bold text-gray-700 text-center">
                {qrDataUrl ? 'Oppure firma qui' : 'Firma qui'}
              </p>
              <SignaturePad
                onSave={handleSignature}
              />
            </div>
          </div>
        </div>

        <div className="p-6 text-center">
          <button onClick={() => setStep('condizioni')} className="text-sm text-gray-400 hover:text-gray-600">
            Torna indietro
          </button>
        </div>
      </div>
    )
  }

  return null
}
