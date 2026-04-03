'use client'

import { useState } from 'react'
import { Monitor, Loader2, CheckCircle2 } from 'lucide-react'

export default function FirmaDisplayButton({ prenotazioneId, strutturaId }: { prenotazioneId: string; strutturaId: string }) {
  const [loading, setLoading] = useState(false)
  const [attivo, setAttivo] = useState(false)

  async function attiva() {
    setLoading(true)
    try {
      const res = await fetch('/api/host/firma-display', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strutturaId, prenotazioneId }),
      })
      if (res.ok) {
        setAttivo(true)
        setTimeout(() => setAttivo(false), 5000)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={attiva}
      disabled={loading || attivo}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        attivo
          ? 'bg-green-100 text-green-700'
          : 'bg-indigo-900 text-white hover:bg-indigo-800'
      } disabled:opacity-50`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : attivo ? <CheckCircle2 size={13} /> : <Monitor size={13} />}
      {attivo ? 'Inviato al display' : 'Firma su display'}
    </button>
  )
}
