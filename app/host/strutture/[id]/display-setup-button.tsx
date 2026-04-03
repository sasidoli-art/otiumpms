'use client'

import { useState, useEffect } from 'react'
import { Monitor, X, ExternalLink, Copy, CheckCircle2, QrCode } from 'lucide-react'
import QRCode from 'qrcode'

export default function DisplaySetupButton({ strutturaId, strutturaNome }: { strutturaId: string; strutturaNome: string }) {
  const [open, setOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const displayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/reception/display/${strutturaId}`
    : `/reception/display/${strutturaId}`

  useEffect(() => {
    if (open && !qrDataUrl) {
      QRCode.toDataURL(displayUrl, { width: 280, margin: 2, color: { dark: '#0f172a' } })
        .then(setQrDataUrl)
    }
  }, [open, displayUrl, qrDataUrl])

  function copyLink() {
    navigator.clipboard.writeText(displayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
      >
        <Monitor className="w-4 h-4" />
        Display firma reception
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-gray-900">Setup display reception</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600">
                Scansiona il QR code con il <strong>tablet della reception</strong> per collegarlo a <strong>{strutturaNome}</strong>.
              </p>

              {/* QR Code */}
              <div className="flex justify-center">
                {qrDataUrl ? (
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm">
                    <img src={qrDataUrl} alt="QR Display" className="w-56 h-56" />
                  </div>
                ) : (
                  <div className="w-56 h-56 skeleton rounded-xl" />
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Dopo la scansione, aggiungi la pagina alla schermata Home del tablet per avere il fullscreen.
              </p>

              {/* Link + azioni */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Link diretto</p>
                <p className="text-xs text-gray-600 font-mono break-all">{displayUrl}</p>
                <div className="flex gap-2">
                  <button
                    onClick={copyLink}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors border border-gray-200 hover:bg-gray-100"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiato!' : 'Copia link'}
                  </button>
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Apri display
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
