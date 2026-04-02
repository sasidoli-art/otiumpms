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
        className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
      >
        <Camera size={20} />
        Scansiona documento d&apos;identità
      </button>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Camera size={18} className="text-white" />
          </div>
          Scansione documento
        </p>
        <button onClick={() => setExpanded(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/50">
          <X size={16} />
        </button>
      </div>

      <p className="text-xs text-blue-600 dark:text-blue-400 -mt-1">
        Scatta una foto del documento fronte e retro. L&apos;OCR compilerà automaticamente i campi.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Fronte */}
        <div>
          <p className="text-xs font-bold text-blue-700 uppercase mb-2 tracking-wide">Fronte</p>
          {fotoFronte ? (
            <div className="relative group">
              <img src={fotoFronte} alt="Fronte" className="w-full h-32 object-cover rounded-xl border-2 border-green-300 shadow-sm" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                <button onClick={() => { setFotoFronte(null); fronteRef.current?.click() }} className="p-2 bg-white rounded-full shadow">
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => setFotoFronte(null)} className="p-2 bg-white rounded-full shadow">
                  <X size={14} />
                </button>
              </div>
              <span className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow">
                <Check size={12} className="text-white" />
              </span>
            </div>
          ) : (
            <button
              onClick={() => fronteRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-100/50 transition-all bg-white/60"
            >
              <div className="p-2.5 bg-blue-100 rounded-full">
                <Camera size={24} className="text-blue-500" />
              </div>
              <span className="text-xs font-medium text-blue-500">Scatta o carica</span>
            </button>
          )}
          <input ref={fronteRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, 'fronte')} />
        </div>

        {/* Retro */}
        <div>
          <p className="text-xs font-bold text-blue-700 uppercase mb-2 tracking-wide">Retro</p>
          {fotoRetro ? (
            <div className="relative group">
              <img src={fotoRetro} alt="Retro" className="w-full h-32 object-cover rounded-xl border-2 border-green-300 shadow-sm" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                <button onClick={() => { setFotoRetro(null); retroRef.current?.click() }} className="p-2 bg-white rounded-full shadow">
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => setFotoRetro(null)} className="p-2 bg-white rounded-full shadow">
                  <X size={14} />
                </button>
              </div>
              <span className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow">
                <Check size={12} className="text-white" />
              </span>
            </div>
          ) : (
            <button
              onClick={() => retroRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-100/50 transition-all bg-white/60"
            >
              <div className="p-2.5 bg-blue-100 rounded-full">
                <Camera size={24} className="text-blue-500" />
              </div>
              <span className="text-xs font-medium text-blue-500">Scatta o carica</span>
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

      {/* Salva */}
      <div className="flex items-center gap-3">
        <button
          onClick={salva}
          disabled={!fotoFronte || saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {saving ? 'Salvataggio...' : 'Salva documenti'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
            <FileCheck size={16} /> Salvato!
          </span>
        )}
      </div>
    </div>
  )
}
