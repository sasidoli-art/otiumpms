'use client'



import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

const RUOLO_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  RECEPTIONIST: 'Receptionist',
  HOUSEKEEPING: 'Housekeeping',
  SPA_OPERATOR: 'Operatore SPA',
  RESTAURANT: 'Ristorazione',
  CONCIERGE: 'Concierge',
  READONLY: 'Solo lettura',
}

interface RegistrationFormProps {
  token: string
  nome: string
  cognome: string
  email: string
  ruolo: string
  hostName: string
}

export function RegistrationForm({ token, nome, cognome, email, ruolo, hostName }: RegistrationFormProps) {
  const _router = useRouter()
  const [password, setPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [completato, setCompletato] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')

    if (password.length < 8) {
      setErrore('La password deve avere almeno 8 caratteri')
      return
    }

    if (password !== confermaPassword) {
      setErrore('Le password non corrispondono')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/registrazione/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        setCompletato(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setErrore(data.error ?? 'Errore durante la registrazione. Riprova.')
      }
    } catch {
      setErrore('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  // ── Schermata completamento ─────────────────────────
  if (completato) {
    return (
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded mb-4">
            <span className="text-3xl">🎭</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Otium Week</h2>
        </div>

        <div className="bg-white rounded shadow-card p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} className="text-green-600" />
          </div>
          <h4 className="text-lg font-bold text-gray-800 mb-2">
            Account creato!{/* TODO: i18n */}
          </h4>
          <p className="text-sm text-gray-500 mb-6">
            Ora puoi accedere alla piattaforma con le tue credenziali.{/* TODO: i18n */}
          </p>
          <a
            href="/login"
            className="btn-primary inline-block px-6 py-2.5 w-full text-center"
          >
            Vai al login{/* TODO: i18n */}
          </a>
        </div>
      </div>
    )
  }

  // ── Form registrazione ──────────────────────────────
  return (
    <div className="w-full max-w-sm">
      {/* Logo / Brand */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded mb-4">
          <span className="text-3xl">🎭</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white">Otium Week</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Registrazione staff{/* TODO: i18n */}
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded shadow-card p-8">
        {/* Invito info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Sei stato invitato da <strong>{hostName}</strong> come{' '}
            <strong>{RUOLO_LABELS[ruolo] ?? ruolo}</strong>{/* TODO: i18n */}
          </p>
        </div>

        <h4 className="text-lg font-bold text-gray-800 mb-1">
          Crea il tuo account{/* TODO: i18n */}
        </h4>
        <p className="text-sm text-gray-400 mb-6">
          Completa la registrazione per accedere alla piattaforma{/* TODO: i18n */}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome</label>{/* TODO: i18n */}
              <input
                type="text"
                value={nome}
                className="input bg-gray-50"
                readOnly
              />
            </div>
            <div>
              <label className="label">Cognome</label>{/* TODO: i18n */}
              <input
                type="text"
                value={cognome}
                className="input bg-gray-50"
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="label">Email</label>{/* TODO: i18n */}
            <input
              type="email"
              value={email}
              className="input bg-gray-50"
              readOnly
            />
          </div>

          <div>
            <label className="label">Password *</label>{/* TODO: i18n */}
            <div className="relative">
              <input
                type={mostraPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                placeholder="Minimo 8 caratteri"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setMostraPassword(!mostraPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostraPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Conferma password *</label>{/* TODO: i18n */}
            <input
              type={mostraPassword ? 'text' : 'password'}
              value={confermaPassword}
              onChange={(e) => setConfermaPassword(e.target.value)}
              className="input"
              placeholder="Ripeti la password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {errore && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
              {errore}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Creazione...' : 'Crea account'}{/* TODO: i18n */}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Hai gia&apos; un account?{' '}
          <a href="/login" className="text-brand-500 hover:underline font-medium">
            Accedi{/* TODO: i18n */}
          </a>
        </p>
      </div>
    </div>
  )
}
