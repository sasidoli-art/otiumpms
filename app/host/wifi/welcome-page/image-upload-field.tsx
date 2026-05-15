'use client'

import { useState, useRef } from 'react'
import { processImage, validateImage, checkOutputSize } from '@/lib/wifi/image-utils'

interface Props {
  label: string
  value: string  // data URI o URL esterno
  onChange: (v: string) => void
  kind: 'logo' | 'background'
  hint?: string
}

export default function ImageUploadField({ label, value, onChange, kind, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(null); setInfo(null); setBusy(true)
    try {
      const validErr = validateImage(file, kind)
      if (validErr) throw new Error(validErr)

      const opts = kind === 'logo'
        ? { maxDimension: 400, quality: 0.92 }
        : { maxDimension: 1600, quality: 0.82 }

      const { dataUri, bytes, width, height } = await processImage(file, opts)

      const sizeErr = checkOutputSize(bytes, kind)
      if (sizeErr) throw new Error(sizeErr)

      onChange(dataUri)
      const dimText = width && height ? `${width}×${height}` : 'SVG'
      setInfo(`✓ ${dimText} · ${(bytes / 1024).toFixed(1)} KB`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'errore')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removeImage() {
    onChange('')
    setInfo(null); setErr(null)
  }

  const hasImage = !!value

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>

      {hasImage && (
        <div className="mb-2 p-2 bg-gray-50 border rounded-lg flex items-center gap-3">
          <div
            className="w-16 h-16 rounded border bg-white shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: kind === 'background' ? `url(${value}) center/cover no-repeat` : '#fff' }}
          >
            {kind === 'logo' && (
              <img src={value} alt="preview" className="max-w-full max-h-full object-contain" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-600 truncate font-mono">
              {value.startsWith('data:') ? `data URI ${(value.length / 1024).toFixed(1)} KB` : value}
            </div>
            {info && <div className="text-xs text-green-600 mt-1">{info}</div>}
          </div>
          <button type="button" onClick={removeImage} className="text-xs text-red-600 hover:underline shrink-0">Rimuovi</button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-50"
        >
          {busy ? 'Elaboro…' : hasImage ? 'Sostituisci' : '📁 Carica file'}
        </button>
        <input
          type="text"
          value={value.startsWith('data:') ? '' : value}
          onChange={e => onChange(e.target.value)}
          placeholder="…o incolla URL"
          className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {hint && !err && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {err && <p className="text-xs text-red-600 mt-1">⚠ {err}</p>}
    </div>
  )
}
