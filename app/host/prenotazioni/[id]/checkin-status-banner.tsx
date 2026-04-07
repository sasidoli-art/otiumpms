'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from 'lucide-react'

export function CheckinStatusBanner({
  prenotazioneId,
  statoCheckIn,
  verificatoAt,
}: {
  prenotazioneId: string
  statoCheckIn: string
  verificatoAt: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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

  if (statoCheckIn === 'VERIFICATO') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-emerald-900 text-sm">Check-in verificato</p>
          <p className="text-xs text-emerald-700">
            Documento verificato in reception
            {verificatoAt && ` il ${new Date(verificatoAt).toLocaleString('it-IT')}`}
          </p>
        </div>
      </div>
    )
  }

  if (statoCheckIn === 'ONLINE_COMPLETATO') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 animate-pulse-slow">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-amber-900 text-sm">Check-in online completato — verifica documento in reception</p>
          <p className="text-xs text-amber-700">L'ospite ha caricato i dati e firmato. Quando arriva, controlla il documento fisico e premi "Verifica".</p>
        </div>
        <button
          onClick={verifica}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Verifica documento
        </button>
      </div>
    )
  }

  // NON_INIZIATO
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
      <ShieldX className="w-5 h-5 text-slate-400 shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-slate-700 text-sm">Check-in non ancora iniziato</p>
        <p className="text-xs text-slate-500">L'ospite non ha ancora completato il check-in online. Puoi inviargli il link o farlo arrivare in reception.</p>
      </div>
    </div>
  )
}
