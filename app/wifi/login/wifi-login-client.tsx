'use client'

import { useState } from 'react'
import {
  Wifi, UserCheck, KeyRound, CheckCircle2, Loader2, AlertCircle,
  ArrowRight, Sparkles, Clock, ShieldCheck, Globe, Mail,
} from 'lucide-react'

type LoginResult = {
  ok: boolean
  sessionId: string
  expiresAt: string
  hostNome: string
  durataMinuti?: number
}

type Step = 'welcome' | 'form' | 'success'

export type WifidogParams = {
  gwAddress: string
  gwPort: string
  gwId: string
  mac: string
  originalUrl: string
}

export type AuthMethods = {
  pms: boolean
  code: boolean
  complimentary: boolean
  complimentaryMins: number
  userForm: boolean
  emailOnly?: boolean
}

type Tab = 'pin' | 'prenotazione' | 'codice' | 'complimentary' | 'user_form' | 'email_only'

export default function WifiLoginClient({
  hostId, hostNome, wifidog, authMethods, redirectUrl, welcomeMessage,
}: {
  hostId: string
  hostNome: string
  wifidog?: WifidogParams | null
  authMethods?: AuthMethods
  redirectUrl?: string | null
  welcomeMessage?: string | null
}) {
  const methods = authMethods ?? { pms: true, code: true, complimentary: false, complimentaryMins: 120, userForm: false, emailOnly: false }

  const availableTabs: { id: Tab; label: string; icon: React.ReactNode }[] = []
  if (methods.pms) availableTabs.push({ id: 'pin', label: 'Ho il PIN', icon: <KeyRound className="w-4 h-4" /> })
  if (methods.pms) availableTabs.push({ id: 'prenotazione', label: 'Camera + Cognome', icon: <UserCheck className="w-4 h-4" /> })
  if (methods.emailOnly) availableTabs.push({ id: 'email_only', label: 'Email prenotazione', icon: <Mail className="w-4 h-4" /> })
  if (methods.code) availableTabs.push({ id: 'codice', label: 'Codice accesso', icon: <KeyRound className="w-4 h-4" /> })
  if (methods.complimentary) availableTabs.push({ id: 'complimentary', label: 'Gratis', icon: <Globe className="w-4 h-4" /> })
  if (methods.userForm) availableTabs.push({ id: 'user_form', label: 'Registrati', icon: <Mail className="w-4 h-4" /> })

  const [step, setStep] = useState<Step>('welcome')
  const [tab, setTab] = useState<Tab>(availableTabs[0]?.id ?? 'codice')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LoginResult | null>(null)

  // Form state
  const [guestNome, setGuestNome] = useState('')
  const [guestCognome, setGuestCognome] = useState('')
  const [numeroCamera, setNumeroCamera] = useState('')
  const [codice, setCodice] = useState('')
  const [codiceNome, setCodiceNome] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formNome, setFormNome] = useState('')
  const [compNome, setCompNome] = useState('')
  const [pinValue, setPinValue] = useState('')
  const [emailOnlyValue, setEmailOnlyValue] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)

    try {
      const macClient = wifidog?.mac || undefined

      let body: Record<string, unknown>
      switch (tab) {
        case 'pin':
          body = { mode: 'pin', hostId, pin: pinValue, macClient }
          break
        case 'prenotazione':
          body = { mode: 'prenotazione', hostId, guestNome, guestCognome, numeroCamera, macClient }
          break
        case 'codice':
          body = { mode: 'codice', hostId, codice, guestNome: codiceNome, macClient }
          break
        case 'complimentary':
          body = { mode: 'complimentary', hostId, guestNome: compNome || 'Visitatore', macClient }
          break
        case 'user_form':
          body = { mode: 'user_form', hostId, guestNome: formNome, guestEmail: formEmail, macClient }
          break
        case 'email_only':
          body = { mode: 'email_only', hostId, guestEmail: emailOnlyValue, macClient }
          break
      }

      const res = await fetch('/api/wifi/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Autenticazione fallita')
        return
      }

      if (wifidog && wifidog.gwAddress && wifidog.gwPort && data.sessionId) {
        const routerUrl =
          `http://${wifidog.gwAddress}:${wifidog.gwPort}/wifidog/auth` +
          `?token=${encodeURIComponent(data.sessionId)}`
        window.location.href = routerUrl
        return
      }

      setResult(data)
      setStep('success')
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  // ─── STEP 1: Welcome ──────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-6 shadow-lg">
            <Wifi className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-2 max-w-xs">{hostNome}</h1>
          <p className="text-white/80 text-sm mb-10 max-w-sm">
            {welcomeMessage || 'Benvenuto. Connettiti alla nostra rete Wi-Fi gratuita.'}
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-sm w-full mb-10">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex flex-col items-center gap-1">
              <Sparkles className="w-5 h-5" />
              <span className="text-[10px] text-center leading-tight">Veloce</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex flex-col items-center gap-1">
              <Clock className="w-5 h-5" />
              <span className="text-[10px] text-center leading-tight">Attivo 24/7</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex flex-col items-center gap-1">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] text-center leading-tight">Sicuro</span>
            </div>
          </div>

          <button
            onClick={() => setStep('form')}
            className="bg-white text-indigo-600 font-semibold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-base"
          >
            Connetti al Wi-Fi <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-white/60 text-xs mt-6">Tocca il bottone per iniziare</p>
        </div>

        <div className="p-4 text-center text-[10px] text-white/60">
          Log accessi conservati 6 mesi (Legge Pisanu) · GDPR compliant
        </div>
      </div>
    )
  }

  // ─── STEP 3: Success ──────────────────────────────────────────────────────
  if (step === 'success' && result) {
    if (redirectUrl) {
      window.location.href = redirectUrl
      return null
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connesso!</h1>
          <p className="text-sm text-gray-500 mb-4">
            Sei connesso alla rete Wi-Fi di <strong>{result.hostNome}</strong>
          </p>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            {result.durataMinuti ? (
              <>Sessione valida per <strong>{result.durataMinuti} minuti</strong></>
            ) : (
              <>Sessione valida fino al<br /><strong>{new Date(result.expiresAt).toLocaleString('it-IT')}</strong></>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Chiudi questa pagina e inizia a navigare.
          </p>
        </div>
      </div>
    )
  }

  // ─── STEP 2: Form con tab dinamici ────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center text-white relative">
          <button
            onClick={() => setStep('welcome')}
            className="absolute top-3 left-3 p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Indietro"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
          <div className="w-12 h-12 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
            <Wifi className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">{hostNome}</h1>
          <p className="text-sm text-white/80">Accesso Wi-Fi</p>
        </div>

        {/* Tabs — solo se ci sono 2+ metodi */}
        {availableTabs.length > 1 && (
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {availableTabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError(null) }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-4">

          {/* TAB: PIN */}
          {tab === 'pin' && (
            <>
              <p className="text-xs text-gray-500">Inserisci il PIN ricevuto alla conferma della prenotazione.</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Il tuo PIN</label>
                <input type="text" inputMode="numeric" required maxLength={5}
                  value={pinValue} onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-2xl font-mono text-center tracking-[0.5em] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </>
          )}

          {/* TAB: Prenotazione (Room + Cognome) */}
          {tab === 'prenotazione' && (
            <>
              <p className="text-xs text-gray-500">Inserisci i dati della tua prenotazione.</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" required autoComplete="given-name" value={guestNome}
                  onChange={e => setGuestNome(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cognome</label>
                <input type="text" autoComplete="family-name" value={guestCognome}
                  onChange={e => setGuestCognome(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numero camera</label>
                <input type="text" required value={numeroCamera}
                  onChange={e => setNumeroCamera(e.target.value)} placeholder="es. 101"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </>
          )}

          {/* TAB: Codice */}
          {tab === 'codice' && (
            <>
              <p className="text-xs text-gray-500">Inserisci il codice di accesso.</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome (opzionale)</label>
                <input type="text" value={codiceNome} onChange={e => setCodiceNome(e.target.value)}
                  placeholder="Il tuo nome"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Codice</label>
                <input type="text" required autoCapitalize="characters" value={codice}
                  onChange={e => setCodice(e.target.value.toUpperCase())} placeholder="ABCD1234"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base font-mono tracking-wider focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </>
          )}

          {/* TAB: Complimentary (accesso gratuito) */}
          {tab === 'complimentary' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <Globe className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-green-800">Accesso gratuito</p>
                <p className="text-xs text-green-600 mt-1">
                  Naviga gratis per {methods.complimentaryMins} minuti
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Il tuo nome (opzionale)</label>
                <input type="text" value={compNome} onChange={e => setCompNome(e.target.value)}
                  placeholder="Come ti chiami?"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </>
          )}

          {/* TAB: Email-only (match prenotazione via sola email) */}
          {tab === 'email_only' && (
            <>
              <p className="text-xs text-gray-500">Usa l&apos;email della tua prenotazione per connetterti.</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email prenotazione</label>
                <input type="email" required value={emailOnlyValue} onChange={e => setEmailOnlyValue(e.target.value)}
                  autoComplete="email" placeholder="mario@esempio.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </>
          )}

          {/* TAB: User Form (registrazione email) */}
          {tab === 'user_form' && (
            <>
              <p className="text-xs text-gray-500">Registrati per accedere al Wi-Fi.</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" required value={formNome} onChange={e => setFormNome(e.target.value)}
                  autoComplete="given-name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  autoComplete="email" placeholder="mario@esempio.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-xs rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Connessione...' : tab === 'complimentary' ? 'Connetti gratis' : 'Connetti Wi-Fi'}
          </button>
        </form>

        <div className="px-6 py-4 bg-gray-50 text-[10px] text-gray-400 text-center">
          Proseguendo accetti i termini di utilizzo della rete · GDPR compliant
        </div>
      </div>
    </div>
  )
}
