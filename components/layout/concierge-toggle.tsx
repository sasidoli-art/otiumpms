'use client'

import { useState, useEffect } from 'react'
import { Bot, Loader2 } from 'lucide-react'

/**
 * ConciergeToggle — interruttore "AI ON/OFF" sempre visibile in topbar.
 *
 * Logica:
 *  - ON  = l'AI risponde autonomamente agli ospiti (concierge in pilota automatico)
 *  - OFF = l'AI tace, gli ospiti vedono solo un auto-reply "ti rispondiamo entro
 *          15 minuti" e il messaggio finisce in coda per intervento umano del host.
 *
 * Persiste su Host.conciergeAttivo via PATCH /api/host/profilo.
 */
export function ConciergeToggle() {
  const [active, setActive] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/host/profilo')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) setActive(d.conciergeAttivo ?? false)
      })
      .catch(() => setActive(false))
  }, [])

  async function toggle() {
    if (active === null || loading) return
    const newVal = !active
    setLoading(true)
    setActive(newVal) // optimistic

    try {
      const res = await fetch('/api/host/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conciergeAttivo: newVal }),
      })
      if (!res.ok) setActive(!newVal) // revert on failure
    } catch {
      setActive(!newVal)
    } finally {
      setLoading(false)
    }
  }

  // Hide while loading initial state
  if (active === null) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
      } disabled:opacity-50`}
      title={
        active
          ? 'AI attiva (pilota automatico): risponde agli ospiti da sola. Click per disattivare.'
          : 'AI disattiva: gli ospiti aspettano una tua risposta manuale. Click per attivare il pilota automatico.'
      }
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Bot className={`w-3.5 h-3.5 ${active ? '' : 'opacity-50'}`} />
      )}
      <span className="hidden sm:inline">AI {active ? 'ON' : 'OFF'}</span>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
        }`}
      />
    </button>
  )
}
