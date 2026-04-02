'use client'

import { useState } from 'react'
import { Tablet, Loader2, Copy, CheckCircle2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export function KioskButton({ prenotazioneId }: { prenotazioneId: string }) {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [tipo, setTipo] = useState<'checkin' | 'checkout' | 'documenti'>('checkout')

  async function generateKiosk() {
    setLoading(true)
    const res = await fetch('/api/host/kiosk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenotazioneId, tipo }),
    })
    if (res.ok) {
      const data = await res.json()
      setUrl(data.url)
    }
    setLoading(false)
  }

  function copyUrl() {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      {!url ? (
        <div className="flex items-center gap-2">
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value as 'checkin' | 'checkout' | 'documenti')}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="checkin">Check-in + Reg Card</option>
            <option value="checkout">Conto checkout</option>
            <option value="documenti">Completa documenti</option>
          </select>
          <button
            onClick={generateKiosk}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Tablet size={13} />}
            Firma su tablet
          </button>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
            <p className="text-xs text-slate-700 font-medium">Link kiosk pronto</p>
          </div>
          <div className="flex gap-1.5">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors justify-center"
            >
              <ExternalLink size={12} /> Apri su tablet
            </a>
            <button
              onClick={copyUrl}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                copied ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              )}
            >
              <Copy size={12} /> {copied ? 'Copiato!' : 'Copia link'}
            </button>
          </div>
          <button
            onClick={() => { setUrl(null); setCopied(false) }}
            className="text-[10px] text-slate-400 hover:text-slate-600"
          >
            Genera nuovo link
          </button>
        </div>
      )}
    </div>
  )
}
