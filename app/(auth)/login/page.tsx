'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff, Loader2, X, Send, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('login')
  const tc = useTranslations('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contactForm, setContactForm] = useState({ nome: '', email: '', messaggio: '' })
  const [contactSending, setContactSending] = useState(false)
  const [contactSent, setContactSent] = useState(false)

  async function handleContact(e: React.FormEvent) {
    e.preventDefault()
    if (!contactForm.nome.trim() || !contactForm.email.trim() || !contactForm.messaggio.trim()) return
    setContactSending(true)
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      setContactSent(true)
      setContactForm({ nome: '', email: '', messaggio: '' })
    } catch {}
    setContactSending(false)
  }

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
      setErrore(tc('unexpectedError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo / Brand */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-4 shadow-lg shadow-blue-500/25">
          <span className="text-xl font-extrabold text-white tracking-tight">OW</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white">Otium Week</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('managementPanel')}</p>
      </div>

      {/* Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
        <h4 className="text-lg font-bold text-gray-800 mb-1">{t('signIn')}</h4>
        <p className="text-sm text-gray-400 mb-6">{t('enterCredentials')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('emailAddress')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder={t('emailPlaceholder')}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label">{t('password')}</label>
            <div className="relative">
              <input
                type={mostraPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                placeholder={t('passwordPlaceholder')}
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
            {loading ? t('signingIn') : t('signIn')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t('trouble')}{' '}
          <button onClick={() => { setShowContact(true); setContactSent(false) }} className="text-brand-500 hover:underline font-medium">
            {t('contactUs')}
          </button>
        </p>
      </div>

      {/* Free trial link */}
      <div className="text-center mt-4">
        <a href="/" className="text-sm text-white/50 hover:text-white/80 transition-colors">
          Prova gratuita 14 giorni &rarr;
        </a>
      </div>

      {/* Contact Modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowContact(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <button onClick={() => setShowContact(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>

            {contactSent ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-gray-900 text-lg">Messaggio inviato!</p>
                <p className="text-sm text-gray-500 mt-1">Ti risponderemo al più presto.</p>
                <button onClick={() => setShowContact(false)} className="mt-4 text-sm text-brand-500 hover:underline">Chiudi</button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Contattaci</h3>
                <p className="text-sm text-gray-500 mb-4">Compila il form e ti risponderemo a info@otiumweek.it</p>
                <form onSubmit={handleContact} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={contactForm.nome}
                      onChange={e => setContactForm(f => ({ ...f, nome: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Messaggio *</label>
                    <textarea
                      value={contactForm.messaggio}
                      onChange={e => setContactForm(f => ({ ...f, messaggio: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 resize-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={contactSending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {contactSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {contactSending ? 'Invio...' : 'Invia messaggio'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
