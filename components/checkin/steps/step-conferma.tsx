'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, Calendar, Home, Users, MapPin, Phone,
  Loader2, AlertCircle, Copy, Check, Wifi, Shield, RotateCcw,
} from 'lucide-react'
import { isModuloAttivo } from '@/lib/moduli'

// ─── Types ──────────────────────────────────────────────────────────────────

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

interface CheckInResult {
  guestNome: string
  guestCognome: string
  dataArrivo: string
  dataPartenza?: string | null
  numOspiti: number
  pin?: string | null
  unitaNome?: string | null
  strutturaNome?: string | null
  strutturaIndirizzo?: string | null
  strutturaCitta?: string | null
  messaggioChiusura?: string | null
  hostNome?: string | null
  hostTelefono?: string | null
  moduliAttivi?: unknown
}

interface Props {
  token: string
  checkInData: Record<string, unknown>
  prenotazione: {
    guestNome: string
    guestCognome: string
    dataArrivo: string
    dataPartenza?: string | null
    numOspiti: number
    unitaNome?: string | null
    strutturaNome?: string
    pin?: string | null
  }
  accompagnatori?: { nome: string; cognome: string }[]
  hostTelefono?: string | null
  accentColor?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function StepConferma({
  token, checkInData, prenotazione: p, accompagnatori, hostTelefono, accentColor,
}: Props) {
  const accent = accentColor || '#4f46e5'
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const submit = useCallback(async () => {
    setStatus('loading')
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/checkin/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInData),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Errore durante il check-in')
        setStatus('error')
        return
      }

      setResult(data.prenotazione)
      setStatus('success')
    } catch {
      setErrorMsg('Errore di connessione. Verifica la tua rete e riprova.')
      setStatus('error')
    }
  }, [token, checkInData])

  const copyPin = useCallback(() => {
    if (result?.pin) {
      navigator.clipboard.writeText(result.pin).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [result])

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return iso }
  }

  // ─── IDLE: Riepilogo pre-submit ─────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="space-y-5 pb-4">
        <div className="text-center py-2">
          <h2 className="text-lg font-bold text-gray-900">Tutto pronto!</h2>
          <p className="text-sm text-gray-500 mt-1">Verifica i dati e conferma il check-in.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{p.guestNome} {p.guestCognome}</p>
              <p className="text-xs text-gray-500">{p.numOspiti} ospite{p.numOspiti > 1 ? 'i' : ''}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm text-gray-800">{fmtDate(p.dataArrivo)}</p>
              {p.dataPartenza && <p className="text-xs text-gray-500">→ {fmtDate(p.dataPartenza)}</p>}
            </div>
          </div>
          {p.unitaNome && (
            <div className="p-4 flex items-center gap-3">
              <Home className="w-5 h-5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-800">{p.unitaNome}</p>
            </div>
          )}
          {accompagnatori && accompagnatori.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Accompagnatori</p>
              {accompagnatori.map((a, i) => (
                <p key={i} className="text-sm text-gray-800">· {a.nome} {a.cognome}</p>
              ))}
            </div>
          )}
          <div className="p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-800">Documento + firma acquisiti</p>
            <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
          </div>
        </div>

        <button type="button" onClick={submit}
          className="w-full py-4 rounded-xl text-white font-semibold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
          style={{ backgroundColor: accent }}>
          Conferma check-in →
        </button>

        <p className="text-[10px] text-gray-400 text-center">
          La reception verificherà il documento originale al tuo arrivo.
        </p>
      </div>
    )
  }

  // ─── LOADING ────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: accent }} />
        </motion.div>
        <p className="text-base font-semibold text-gray-800">Stiamo registrando il tuo arrivo...</p>
        <p className="text-sm text-gray-500 mt-2">Non chiudere questa pagina</p>
      </div>
    )
  }

  // ─── ERROR ──────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </motion.div>
        <h2 className="text-lg font-bold text-gray-900">Si è verificato un errore</h2>
        <p className="text-sm text-gray-500 text-center max-w-xs">{errorMsg}</p>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={submit}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm"
            style={{ backgroundColor: accent }}>
            <RotateCcw className="w-4 h-4" /> Riprova
          </button>
          {hostTelefono && (
            <a href={`tel:${hostTelefono}`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50">
              <Phone className="w-4 h-4" /> Chiama struttura
            </a>
          )}
        </div>
      </div>
    )
  }

  // ─── SUCCESS ────────────────────────────────────────────────────────────
  const r = result!
  const hasWifi = r.moduliAttivi ? isModuloAttivo(r.moduliAttivi, 'wifi') : false

  return (
    <div className="space-y-5 pb-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="text-center py-4">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${accent}15` }}>
          <CheckCircle2 className="w-10 h-10" style={{ color: accent }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Check-in completato!</h2>
        <p className="text-sm text-gray-500 mt-1">Presentati in reception con il documento per la verifica finale.</p>
      </motion.div>

      {r.messaggioChiusura && (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-700 italic">&ldquo;{r.messaggioChiusura}&rdquo;</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-400 shrink-0" />
          <p className="text-sm font-semibold text-gray-900">{r.guestNome} {r.guestCognome}</p>
        </div>
        <div className="p-4 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-800">{fmtDate(r.dataArrivo)}</p>
        </div>
        {r.unitaNome && (
          <div className="p-4 flex items-center gap-3">
            <Home className="w-5 h-5 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-800">{r.unitaNome}</p>
          </div>
        )}
      </div>

      {r.pin && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Il tuo codice soggiorno</p>
          <p className="text-4xl font-mono font-bold tracking-[0.5em]" style={{ color: accent }}>{r.pin}</p>
          <p className="text-xs text-gray-400 mt-2">WiFi · Servizi in camera · Concierge AI</p>
          <button type="button" onClick={copyPin}
            className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiato!' : 'Salva su telefono'}
          </button>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Info utili</p>
        {hasWifi && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Wifi className="w-3.5 h-3.5 text-gray-400" />
            <span>Usa il PIN per connetterti al WiFi</span>
          </div>
        )}
        {(r.strutturaIndirizzo || r.strutturaCitta) && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>{[r.strutturaIndirizzo, r.strutturaCitta].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {r.hostTelefono && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <a href={`tel:${r.hostTelefono}`} style={{ color: accent }}>{r.hostTelefono}</a>
          </div>
        )}
      </div>
    </div>
  )
}
