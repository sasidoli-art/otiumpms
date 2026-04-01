'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download, X } from 'lucide-react'

export function PwaProvider() {
  const t = useTranslations('pwa')
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      const dismissed = localStorage.getItem('pwa-dismissed')
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 86400000) {
        setShowBanner(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!installPrompt) return
    ;(installPrompt as any).prompt()
    const result = await (installPrompt as any).userChoice
    if (result.outcome === 'accepted') {
      setShowBanner(false)
      setInstallPrompt(null)
    }
  }

  function dismiss() {
    setShowBanner(false)
    localStorage.setItem('pwa-dismissed', String(Date.now()))
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center gap-3 animate-in slide-in-from-bottom">
      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
        <Download className="w-5 h-5 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{t('install')}</p>
        <p className="text-xs text-gray-500">{t('quickAccess')}</p>
      </div>
      <button
        onClick={install}
        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
      >
        {t('installButton')}
      </button>
      <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
