'use client'

import { useState, useRef } from 'react'
import { Camera, X, Check, RotateCcw, Loader2, FileCheck, Upload, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Componente per acquisizione documento ospite lato reception.
 * Funziona con:
 * - Webcam PC (via getUserMedia)
 * - Fotocamera tablet/telefono (via input file capture)
 * - Scanner USB (appare come fotocamera nel browser)
 *
 * Il receptionist acquisisce fronte e retro direttamente dalla pagina prenotazione.
 */
type OCRResult = {
  guestTipoDocumento?: string
  guestNumeroDocumento?: string
  guestDataNascita?: string
  guestLuogoNascita?: string
  guestNome?: string
  guestCognome?: string
}

export function DocumentScanner({ prenotazioneId, onOCRExtract }: { prenotazioneId: string; onOCRExtract?: (data: OCRResult) => void }) {
  const [fotoFronte, setFotoFronte] = useState<string | null>(null)
  const [fotoRetro, setFotoRetro] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const fronteRef = useRef<HTMLInputElement>(null)
  const retroRef = useRef<HTMLInputElement>(null)

  function handleCapture(e: React.ChangeEvent<HTMLInputElement>, side: 'fronte' | 'retro') {
    const file = e.target.files?.[0]
    if (!file) return

    // Resize image to max 1200px width for storage
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 1200
        const scale = img.width > maxW ? maxW / img.width : 1
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const base64 = canvas.toDataURL('image/jpeg', 0.8)
        if (side === 'fronte') {
          setFotoFronte(base64)
          // Auto-run OCR on front image
          runOCR(base64)
        } else {
          setFotoRetro(base64)
        }
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  async function runOCR(imageBase64: string) {
    setOcrRunning(true)
    setOcrResult(null)
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('ita+eng')
      const { data: { text } } = await worker.recognize(imageBase64)
      await worker.terminate()

      // Parse OCR text
      const result: OCRResult = {}
      const upper = text.toUpperCase()

      // Tipo documento
      if (upper.includes('PASSAPORTO') || upper.includes('PASSPORT')) result.guestTipoDocumento = 'PPORT'
      else if (upper.includes("CARTA D'IDENTIT") || upper.includes('IDENTITY CARD') || upper.includes('CARTA DI IDENTIT')) result.guestTipoDocumento = 'IDENTE'
      else if (upper.includes('PATENTE') || upper.includes('DRIVING')) result.guestTipoDocumento = 'PATEN'

      // Numero documento (pattern: lettere+numeri, 7-12 chars)
      const numMatch = text.match(/\b([A-Z]{2}\d{5,7}[A-Z]?|\d{9}|[A-Z]\d{8})\b/i)
      if (numMatch) result.guestNumeroDocumento = numMatch[1].toUpperCase()

      // Data nascita (pattern: DD/MM/YYYY o DD.MM.YYYY)
      const dateMatch = text.match(/(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/)
      if (dateMatch) result.guestDataNascita = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`

      // Nome e cognome (dalla riga dopo "COGNOME" o "SURNAME")
      const cognomeMatch = text.match(/(?:COGNOME|SURNAME|NOM|1\.)\s*[:\n]?\s*([A-ZÀÈÉÌÒÙ][a-zàèéìòù]+)/i)
      if (cognomeMatch) result.guestCognome = cognomeMatch[1]

      const nomeMatch = text.match(/(?:NOME|NAME|GIVEN|PRÉNOM|2\.)\s*[:\n]?\s*([A-ZÀÈÉÌÒÙ][a-zàèéìòù]+)/i)
      if (nomeMatch) result.guestNome = nomeMatch[1]

      // Luogo nascita
      const luogoMatch = text.match(/(?:NATO A|PLACE OF BIRTH|LIEU DE NAISSANCE|LUOGO DI NASCITA)\s*[:\n]?\s*([A-ZÀÈÉÌÒÙ][A-Za-zàèéìòù\s]+)/i)
      if (luogoMatch) result.guestLuogoNascita = luogoMatch[1].trim()

      setOcrResult(result)
      if (onOCRExtract && Object.keys(result).length > 0) {
        onOCRExtract(result)
      }
    } catch {
      // OCR failed silently
    }
    setOcrRunning(false)
  }

  async function salva() {
    if (!fotoFronte) return
    setSaving(true)
    try {
      const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/documenti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fotoDocumentoFronte: fotoFronte,
          fotoDocumentoRetro: fotoRetro,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 5000)
      }
    } catch {}
    setSaving(false)
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Camera size={14} />
        Scansiona documento
      </button>
    )
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Camera size={15} className="text-blue-600" />
          Acquisizione documento
        </p>
        <button onClick={() => setExpanded(false)} className="text-slate-400 hover:text-slate-600 p-1">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Fronte */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Fronte</p>
          {fotoFronte ? (
            <div className="relative group">
              <img src={fotoFronte} alt="Fronte" className="w-full h-24 object-cover rounded-lg border border-slate-200" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <button onClick={() => { setFotoFronte(null); fronteRef.current?.click() }} className="p-1.5 bg-white rounded-full">
                  <RotateCcw size={12} />
                </button>
                <button onClick={() => setFotoFronte(null)} className="p-1.5 bg-white rounded-full">
                  <X size={12} />
                </button>
              </div>
              <span className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={10} className="text-white" />
              </span>
            </div>
          ) : (
            <button
              onClick={() => fronteRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <Camera size={20} className="text-slate-400" />
              <span className="text-[10px] text-slate-400">Scatta o carica</span>
            </button>
          )}
          {/* Input nascosti — capture="environment" usa la fotocamera posteriore su mobile */}
          <input ref={fronteRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, 'fronte')} />
        </div>

        {/* Retro */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Retro</p>
          {fotoRetro ? (
            <div className="relative group">
              <img src={fotoRetro} alt="Retro" className="w-full h-24 object-cover rounded-lg border border-slate-200" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <button onClick={() => { setFotoRetro(null); retroRef.current?.click() }} className="p-1.5 bg-white rounded-full">
                  <RotateCcw size={12} />
                </button>
                <button onClick={() => setFotoRetro(null)} className="p-1.5 bg-white rounded-full">
                  <X size={12} />
                </button>
              </div>
              <span className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={10} className="text-white" />
              </span>
            </div>
          ) : (
            <button
              onClick={() => retroRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <Camera size={20} className="text-slate-400" />
              <span className="text-[10px] text-slate-400">Scatta o carica</span>
            </button>
          )}
          <input ref={retroRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, 'retro')} />
        </div>
      </div>

      {/* OCR Results */}
      {ocrRunning && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
          <Loader2 size={12} className="animate-spin" />
          <Sparkles size={12} />
          Analisi OCR in corso — i campi verranno compilati automaticamente...
        </div>
      )}
      {ocrResult && Object.keys(ocrResult).length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 space-y-0.5">
          <p className="text-[10px] font-semibold text-green-700 flex items-center gap-1">
            <Sparkles size={10} /> Dati estratti dal documento (OCR)
          </p>
          {ocrResult.guestTipoDocumento && <p className="text-[10px] text-green-600">Tipo: {ocrResult.guestTipoDocumento}</p>}
          {ocrResult.guestNumeroDocumento && <p className="text-[10px] text-green-600">Numero: {ocrResult.guestNumeroDocumento}</p>}
          {ocrResult.guestCognome && <p className="text-[10px] text-green-600">Cognome: {ocrResult.guestCognome}</p>}
          {ocrResult.guestNome && <p className="text-[10px] text-green-600">Nome: {ocrResult.guestNome}</p>}
          {ocrResult.guestDataNascita && <p className="text-[10px] text-green-600">Nascita: {ocrResult.guestDataNascita}</p>}
          {ocrResult.guestLuogoNascita && <p className="text-[10px] text-green-600">Luogo: {ocrResult.guestLuogoNascita}</p>}
        </div>
      )}

      {/* Info */}
      <p className="text-[10px] text-slate-400">
        Usa la fotocamera del dispositivo, la webcam o collega uno scanner. L'OCR compila automaticamente i campi del check-in.
      </p>

      {/* Salva */}
      <div className="flex items-center gap-2">
        <button
          onClick={salva}
          disabled={!fotoFronte || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {saving ? 'Salvataggio...' : 'Salva documenti'}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <FileCheck size={13} /> Salvato!
          </span>
        )}
      </div>
    </div>
  )
}
