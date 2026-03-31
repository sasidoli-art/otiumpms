'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Cookie, Shield, Database } from 'lucide-react'

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Controlla se l'utente ha già accettato i cookie
    const hasConsent = localStorage.getItem('cookie-consent')
    if (!hasConsent) {
      // Mostra il banner dopo 1 secondo per dare tempo alla pagina di caricare
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', 'all')
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setShowBanner(false)
  }

  const handleAcceptNecessary = () => {
    localStorage.setItem('cookie-consent', 'necessary')
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setShowBanner(false)
  }

  const handleRejectAll = () => {
    localStorage.setItem('cookie-consent', 'rejected')
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-2 duration-300">
      <div className="mx-auto max-w-7xl px-4 pb-6">
        <div className="relative rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-2xl ring-1 ring-blue-200/50 backdrop-blur-sm">
          {/* Close button */}
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-white/50 hover:text-gray-600"
            aria-label="Chiudi banner"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {/* Icone */}
            <div className="flex items-center gap-3 md:w-1/4">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <Cookie size={24} className="text-blue-600" />
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <Shield size={24} className="text-green-600" />
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <Database size={24} className="text-purple-600" />
              </div>
            </div>

            {/* Contenuto */}
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                La tua privacy è importante per noi
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                Utilizziamo cookie per migliorare la tua esperienza, analizzare il traffico e personalizzare i contenuti. 
                I cookie necessari sono essenziali per il funzionamento del sito. Puoi scegliere quali tipi di cookie accettare.
              </p>
              
              <div className="mb-5 rounded-lg bg-white/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Cookie necessari</p>
                    <p className="text-xs text-gray-500">Sempre attivi • Sicurezza, login, sessione</p>
                  </div>
                  <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    Sempre attivi
                  </div>
                </div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Cookie analitici</p>
                    <p className="text-xs text-gray-500">Per capire come usi il nostro sito</p>
                  </div>
                  <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                    Opzionali
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Cookie marketing</p>
                    <p className="text-xs text-gray-500">Per mostrarti contenuti pertinenti</p>
                  </div>
                  <div className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                    Opzionali
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleAcceptAll}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Accetta tutti i cookie
                </button>
                <button
                  onClick={handleAcceptNecessary}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Solo necessari
                </button>
                <button
                  onClick={handleRejectAll}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Rifiuta tutti
                </button>
                <div className="flex-1 text-right">
                  <Link
                    href="/privacy-policy"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Scopri di più sulla privacy →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
