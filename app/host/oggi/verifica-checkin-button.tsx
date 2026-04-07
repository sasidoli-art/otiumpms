'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Loader2 } from 'lucide-react'

export function VerificaCheckinButton({ prenotazioneId, statoCheckIn }: { prenotazioneId: string; statoCheckIn: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (statoCheckIn === 'VERIFICATO') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
        <ShieldCheck className="w-3 h-3" /> Verificato
      </span>
    )
  }

  if (statoCheckIn === 'NON_INIZIATO') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
        Non iniziato
      </span>
    )
  }

  // ONLINE_COMPLETATO
  async function verifica() {
    if (!confirm('Confermi di aver verificato fisicamente il documento dell\'ospite?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/verifica-checkin`, { method: 'POST' })
      if (res.ok) router.refresh()
      else setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={verifica}
      disabled={loading}
      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-full transition-colors animate-pulse"
      title="Online OK — verifica documento in reception"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
      Verifica doc
    </button>
  )
}
