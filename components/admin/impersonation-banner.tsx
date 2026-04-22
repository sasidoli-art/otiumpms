'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, LogOut, Loader2 } from 'lucide-react'

/**
 * Banner visibile in cima alle pagine quando un ADMIN sta impersonando un host.
 * Legge il cookie non-httpOnly `otium-imp-name` (settato dal server contestualmente
 * al token httpOnly) e mostra la barra rossa + bottone "Torna ad admin".
 */
export default function ImpersonationBanner() {
  const router = useRouter()
  const [hostName, setHostName] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Leggi cookie lato client
    const m = document.cookie.match(/otium-imp-name=([^;]+)/)
    if (m) {
      try { setHostName(decodeURIComponent(m[1])) } catch { setHostName(m[1]) }
    }
  }, [])

  async function torna() {
    setLeaving(true)
    await fetch('/api/admin/impersona/stop', { method: 'POST' })
    router.push('/admin/host')
    router.refresh()
  }

  if (!hostName) return null

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
        <p className="flex-1 text-sm font-medium">
          Stai visualizzando come <strong>{hostName}</strong> — ADMIN impersonation attiva
        </p>
        <button
          onClick={torna}
          disabled={leaving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Torna ad admin
        </button>
      </div>
    </div>
  )
}
