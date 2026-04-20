'use client'

/**
 * Cookie banner GDPR per pagine pubbliche (/book, /checkin, /privacy).
 *
 * Stato persistito nel cookie `otium_cookie_consent` (JSON, 12 mesi).
 * Lazy-loaded (appare 1s dopo mount) per non impattare FCP.
 * Se analytics=true, emette un custom event `otium:analytics-enabled`
 * che altri componenti possono ascoltare per caricare gli script.
 */

import { useEffect, useState } from 'react'
import { Cookie, Settings, X } from 'lucide-react'

type CookieConsent = {
  tecnici: true
  analytics: boolean
  marketing: boolean
  timestamp: string
}

const STORAGE_KEY = 'otium_cookie_consent'
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365 // 12 mesi

export function getCookieConsent(): CookieConsent | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`${STORAGE_KEY}=([^;]+)`))
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match[1])) as CookieConsent
  } catch {
    return null
  }
}

function setCookieConsent(consent: Omit<CookieConsent, 'tecnici' | 'timestamp'>) {
  const value: CookieConsent = {
    tecnici: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    timestamp: new Date().toISOString(),
  }
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`
  // Notifica altri componenti
  window.dispatchEvent(
    new CustomEvent('otium:consent-change', { detail: value }),
  )
  if (value.analytics) {
    window.dispatchEvent(new CustomEvent('otium:analytics-enabled'))
  }
}

export default function CookieBanner() {
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)
  const [personalizza, setPersonalizza] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  // Lazy-show: appare 1s dopo il mount (non impatta FCP)
  useEffect(() => {
    setMounted(true)
    const existing = getCookieConsent()
    if (existing) {
      // Notifica componenti consumer che il consenso è già stato dato
      if (existing.analytics) {
        window.dispatchEvent(new CustomEvent('otium:analytics-enabled'))
      }
      return
    }
    const t = setTimeout(() => setShow(true), 1000)
    return () => clearTimeout(t)
  }, [])

  if (!mounted || !show) return null

  function acceptAll() {
    setCookieConsent({ analytics: true, marketing: true })
    setShow(false)
  }

  function acceptNecessary() {
    setCookieConsent({ analytics: false, marketing: false })
    setShow(false)
  }

  function savePersonalizzato() {
    setCookieConsent({ analytics, marketing })
    setShow(false)
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed bottom-0 left-0 right-0 z-[60] bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.12)] border-t border-gray-200 animate-[slide-up_300ms_ease-out]"
      style={{ animationFillMode: 'backwards' }}
    >
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-4 md:py-5">
        {!personalizza ? (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p id="cookie-banner-title" className="text-sm font-semibold text-gray-900 mb-1">
                  Utilizziamo cookie
                </p>
                <p id="cookie-banner-desc" className="text-xs md:text-sm text-gray-600 leading-relaxed">
                  Cookie tecnici necessari al funzionamento del sito. Con il tuo consenso, cookie
                  di analisi per migliorare il servizio. Niente profilazione pubblicitaria.{' '}
                  <a href="/privacy" className="text-indigo-600 hover:underline">
                    Cookie policy
                  </a>
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => setPersonalizza(true)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" /> Personalizza
              </button>
              <button
                onClick={acceptNecessary}
                className="px-4 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Solo necessari
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Accetta tutti
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <p className="text-sm font-semibold text-gray-900">Personalizza preferenze</p>
              </div>
              <button
                onClick={() => setPersonalizza(false)}
                aria-label="Chiudi"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 mb-4">
              <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50 cursor-not-allowed">
                <input type="checkbox" checked disabled className="mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Cookie tecnici</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Necessari al funzionamento del sito (sessione, preferenze lingua, consenso).
                    Non disattivabili.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Cookie di analisi</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Statistiche aggregate anonime per migliorare il servizio (performance,
                    errori). Nessuna profilazione individuale.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Cookie di marketing</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Attualmente non utilizziamo cookie di marketing. Il consenso viene memorizzato
                    per eventuali futuri utilizzi.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:justify-end">
              <button
                onClick={acceptNecessary}
                className="px-4 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Rifiuta tutti
              </button>
              <button
                onClick={savePersonalizzato}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Salva preferenze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
