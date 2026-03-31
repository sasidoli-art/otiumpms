'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setErrore(result.error)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setErrore('Errore imprevisto. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo / Brand */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded mb-4">
          <span className="text-3xl">🎭</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white">Otium Week</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Pannello di gestione</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded shadow-card p-8">
        <h4 className="text-lg font-bold text-gray-800 mb-1">Accedi</h4>
        <p className="text-sm text-gray-400 mb-6">Inserisci le tue credenziali per continuare.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Indirizzo Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="nome@esempio.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={mostraPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                placeholder="Inserisci la tua password"
                required
                autoComplete="current-password"
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
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Problemi?{' '}
          <a href="mailto:info@otiumweek.it" className="text-brand-500 hover:underline font-medium">
            Contattaci
          </a>
        </p>
      </div>
    </div>
  )
}
