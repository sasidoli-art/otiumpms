'use client'

import { useRef, useState, useCallback } from 'react'
import { Camera, X, Upload } from 'lucide-react'

interface ImageUploadProps {
  value: string | null
  onChange: (base64: string | null) => void
  maxSizeMB?: number
  className?: string
  label?: string
}

/**
 * Reusable image upload component.
 * - Client-side resize to max 800px width, JPEG 0.7 quality
 * - Drag & drop support
 * - Preview + remove
 */
export default function ImageUpload({
  value,
  onChange,
  maxSizeMB = 2,
  className = '',
  label = 'Immagine',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const processFile = useCallback(
    async (file: File) => {
      setError('')

      // Validate type
      if (!file.type.startsWith('image/')) {
        setError('Seleziona un file immagine (JPG, PNG, WebP)')
        return
      }

      // Validate size (raw file)
      if (file.size > maxSizeMB * 1024 * 1024 * 2) {
        // Allow 2x raw because we compress
        setError(`File troppo grande (max ${maxSizeMB * 2}MB prima della compressione)`)
        return
      }

      setLoading(true)

      try {
        const base64 = await resizeAndCompress(file, 800, 0.7)

        // Check compressed size
        const sizeBytes = Math.ceil((base64.length * 3) / 4)
        if (sizeBytes > maxSizeMB * 1024 * 1024) {
          setError(`Immagine troppo grande anche dopo compressione (max ${maxSizeMB}MB)`)
          setLoading(false)
          return
        }

        onChange(base64)
      } catch {
        setError('Errore durante l\'elaborazione dell\'immagine')
      } finally {
        setLoading(false)
      }
    },
    [maxSizeMB, onChange]
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  return (
    <div className={className}>
      {label && (
        <label className="label mb-1.5">{label}</label>
      )}

      {value ? (
        /* ─── Preview ─── */
        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 border border-gray-200 rounded-full shadow-sm transition-colors group-hover:opacity-100 opacity-70"
            title="Rimuovi immagine"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ) : (
        /* ─── Upload area ─── */
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            flex flex-col items-center justify-center gap-2 px-4 py-8
            border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
            }
            ${loading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          {loading ? (
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <Camera className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  <span className="text-indigo-600">Carica immagine</span> o trascina qui
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  JPG, PNG, WebP &middot; max {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resize image to maxWidth and compress as JPEG base64 data URL.
 */
function resizeAndCompress(
  file: File,
  maxWidth: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas')

        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context unavailable'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = reader.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
