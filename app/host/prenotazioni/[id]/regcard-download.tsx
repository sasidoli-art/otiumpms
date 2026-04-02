'use client'

import { useState } from 'react'
import { FileText, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

export function RegCardDownload({ prenotazioneId, firmata }: { prenotazioneId: string; firmata: boolean }) {
  const [loading, setLoading] = useState(false)

  async function scarica() {
    setLoading(true)
    try {
      const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/regcard-pdf`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `RegCard_${prenotazioneId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      {firmata ? (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 size={13} /> Firmata
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle size={13} /> Da firmare
        </span>
      )}
      <button
        onClick={scarica}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        Scarica PDF
      </button>
    </div>
  )
}
