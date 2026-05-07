'use client'

import { useState, useRef } from 'react'
import { Loader2, Camera, Upload, X, CheckCircle2 } from 'lucide-react'

interface OCRResult {
  guestTipoDocumento?: string
  guestNumeroDocumento?: string
  guestDataNascita?: string
  guestLuogoNascita?: string
}

interface DocumentOCRProps {
  onExtract: (data: OCRResult) => void
}

function parseDocument(text: string): OCRResult {
    const result: OCRResult = {}

    // Rileva tipo documento
    if (
      text.includes('PASSAPORTO') ||
      text.includes('PASSPORT') ||
      text.includes('DIPLOMATIC PASSPORT')
    ) {
      result.guestTipoDocumento = 'PPORT'
    } else if (text.includes("CARTA D'IDENTITÀ") || text.includes('IDENTITY CARD')) {
      result.guestTipoDocumento = 'IDENTE'
    } else if (text.includes('PATENTE') || text.includes('DRIVING LICENSE')) {
      result.guestTipoDocumento = 'PATEN'
    } else if (text.includes('PERMESSO') && text.includes('SOGGIORNO')) {
      result.guestTipoDocumento = 'PERMSOS'
    }

    // Estrae numero documento (8-20 caratteri alphanumerici)
    const numMatch = text.match(/\b[A-Z0-9]{6,20}\b/g)
    if (numMatch) {
      // Filtra stringhe comuni
      const filtered = numMatch.find(
        (n) =>
          !['PASSAPORTO', 'PATENTE', 'IDENTITY', 'CARD', 'REPUBBLICA', 'ITALIANA'].includes(n)
      )
      if (filtered) {
        result.guestNumeroDocumento = filtered
      }
    }

    // Estrae data (DD/MM/YYYY o DD.MM.YYYY o altri formati)
    const datePatterns = [
      /(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/g, // DD/MM/YYYY
      /(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/g, // YYYY/MM/DD
    ]

    for (const pattern of datePatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        const [, p1, p2, p3] = match

        let year = 0,
          month = 0,
          day = 0

        // Se primo pattern (DD/MM/YYYY)
        if (p1.length <= 2) {
          day = parseInt(p1)
          month = parseInt(p2)
          year = parseInt(p3)
        } else {
          // Secondo pattern (YYYY/MM/DD)
          year = parseInt(p1)
          month = parseInt(p2)
          day = parseInt(p3)
        }

        // Correlati alla data nascita (solitamente nel documento)
        if (day > 0 && day <= 31 && month > 0 && month <= 12 && year >= 1920 && year <= 2020) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          if (
            !result.guestDataNascita ||
            new Date(dateStr) < new Date(result.guestDataNascita)
          ) {
            result.guestDataNascita = dateStr
          }
        }
      }
    }

    // Estrae luogo di nascita (parole precedute da "NASCITA" o "LUOGO")
    const luogoMatch = text.match(/(?:LUOGO|NASCITA)\s+(?:DI\s+)?(\w+)/i)
    if (luogoMatch) {
      result.guestLuogoNascita = luogoMatch[1]
    }

    return result
  }

export default function DocumentOCR({ onExtract }: DocumentOCRProps) {
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState<OCRResult | null>(null)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleCameraClick() {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cam = devices.some(d => d.kind === 'videoinput')
        if (!cam) {
          setError('Nessuna fotocamera rilevata su questo dispositivo. Usa "Carica file" per selezionare un\'immagine del documento.')
          return
        }
      }
    } catch {
      // Se il check fallisce, proviamo comunque ad aprire la fotocamera
    }
    cameraRef.current?.click()
  }

  async function processImage(file: File) {
    setLoading(true)
    setError('')
    try {
      // Lazy load Tesseract.js solo quando necessario
      const Tesseract = await import('tesseract.js')

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string
          const result = await Tesseract.recognize(imageData, 'ita+eng', {
            logger: (m: { progress: number }) => console.log('OCR:', m.progress),
          })

          const text = result.data.text.toUpperCase()
          const parsed = parseDocument(text)
          setExtracted(parsed)
          onExtract(parsed)
          setShowModal(true)
          setLoading(false)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Errore nel parsing')
          setLoading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore OCR')
      setLoading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  if (loading) {
    return (
      <div className="border-2 border-dashed border-indigo-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-indigo-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-indigo-700">Analizzando documento...</p>
        <p className="text-xs text-indigo-600">Questa operazione potrebbe richiedere alcuni secondi</p>
      </div>
    )
  }

  if (extracted && showModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <h3 className="font-bold text-gray-900">Dati estratti</h3>
          </div>

          <div className="space-y-3 text-sm">
            {extracted.guestTipoDocumento && (
              <div>
                <p className="text-gray-600 font-medium">Tipo documento</p>
                <p className="text-gray-900">{extracted.guestTipoDocumento}</p>
              </div>
            )}
            {extracted.guestNumeroDocumento && (
              <div>
                <p className="text-gray-600 font-medium">Numero</p>
                <p className="text-gray-900">{extracted.guestNumeroDocumento}</p>
              </div>
            )}
            {extracted.guestDataNascita && (
              <div>
                <p className="text-gray-600 font-medium">Data di nascita</p>
                <p className="text-gray-900">{new Date(extracted.guestDataNascita).toLocaleDateString('it-IT')}</p>
              </div>
            )}
            {extracted.guestLuogoNascita && (
              <div>
                <p className="text-gray-600 font-medium">Luogo di nascita</p>
                <p className="text-gray-900">{extracted.guestLuogoNascita}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            ⚠️ Verifica i dati estratti. Se non corretti, modificali manualmente.
          </p>

          <button onClick={() => setShowModal(false)} className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700">
            Continua
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button type="button" onClick={handleCameraClick} className="flex-1 border-2 border-indigo-200 rounded-xl px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50 flex items-center justify-center gap-2">
          <Camera className="w-4 h-4" />
          Fotocamera
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 border-2 border-indigo-200 rounded-xl px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50 flex items-center justify-center gap-2">
          <Upload className="w-4 h-4" />
          Carica file
        </button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
          <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Errore OCR</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500 text-center">Fotografia il documento per compilare i campi automaticamente</p>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
    </div>
  )
}
