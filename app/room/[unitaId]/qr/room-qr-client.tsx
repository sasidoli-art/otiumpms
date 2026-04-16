'use client'

import { useEffect, useState } from 'react'
import { QrCode, Printer, Download, Wifi } from 'lucide-react'
import QRCode from 'qrcode'

export default function RoomQrClient({
  roomUrl, unitaNome, strutturaNome, hostNome, logo,
}: {
  roomUrl: string
  unitaNome: string
  strutturaNome: string
  hostNome: string
  logo: string | null
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(roomUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: { dark: '#1e293b', light: '#ffffff' },
    }).then(setQrDataUrl)
  }, [roomUrl])

  function downloadQr() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${unitaNome.replace(/[^a-zA-Z0-9]/g, '-')}.png`
    a.click()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      {/* Printable card */}
      <div className="w-full max-w-sm border-2 border-gray-200 rounded-2xl p-8 text-center print:border-0 print:shadow-none">
        {/* Logo / Brand */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Wifi className="w-5 h-5 text-indigo-600" />
          <span className="text-lg font-bold text-gray-900">{hostNome}</span>
        </div>
        <p className="text-xs text-gray-500 mb-6">{strutturaNome}</p>

        {/* QR */}
        <div className="flex justify-center mb-4">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt={`QR ${unitaNome}`} className="w-56 h-56" />
          ) : (
            <div className="w-56 h-56 bg-gray-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-12 h-12 text-gray-300 animate-pulse" />
            </div>
          )}
        </div>

        {/* Room name */}
        <h2 className="text-xl font-bold text-gray-900 mb-1">{unitaNome}</h2>
        <p className="text-sm text-gray-500 mb-4">Scansiona per accedere ai servizi</p>

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-3 text-[11px] text-gray-600 leading-relaxed">
          <p className="font-semibold mb-1">Come funziona:</p>
          <p>1. Scansiona il QR con la fotocamera del telefono</p>
          <p>2. Inserisci il PIN ricevuto nella email di conferma</p>
          <p>3. Accedi a WiFi, menu, SPA, concierge e tutti i servizi</p>
        </div>

        <p className="text-[9px] text-gray-300 mt-4 print:hidden">{roomUrl}</p>
      </div>

      {/* Actions — hidden when printing */}
      <div className="flex gap-3 mt-6 print:hidden">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">
          <Printer className="w-4 h-4" /> Stampa
        </button>
        <button onClick={downloadQr}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold">
          <Download className="w-4 h-4" /> Scarica PNG
        </button>
      </div>

      {/* NFC info */}
      <div className="mt-6 max-w-sm text-center text-xs text-gray-400 print:hidden">
        <p className="font-semibold text-gray-500 mb-1">Per NFC tag:</p>
        <p>Scrivi questo URL su un tag NTAG215 con qualsiasi app NFC:</p>
        <p className="font-mono text-[10px] bg-gray-50 p-2 rounded mt-1 break-all select-all">{roomUrl}</p>
      </div>
    </div>
  )
}
