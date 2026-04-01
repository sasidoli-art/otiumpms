'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Image as ImageIcon, Loader2, Plus } from 'lucide-react'
import ImageUpload from '@/components/ui/image-upload'

interface StrutturaImagesProps {
  strutturaId: string
  immagini: string[]
}

export default function StrutturaImages({ strutturaId, immagini }: StrutturaImagesProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  async function saveImages(newImmagini: string[]) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/host/strutture/${strutturaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immagini: newImmagini }),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error || 'Errore nel salvataggio')
      } else {
        router.refresh()
      }
    } catch {
      setError('Errore di connessione')
    } finally {
      setSaving(false)
      setShowUpload(false)
    }
  }

  function handleNewImage(base64: string | null) {
    if (!base64) return
    saveImages([...immagini, base64])
  }

  function handleRemoveImage(index: number) {
    const newImgs = immagini.filter((_, i) => i !== index)
    saveImages(newImgs)
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900">Immagini</h2>
          {immagini.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {immagini.length}
            </span>
          )}
        </div>
        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            disabled={saving}
            className="btn-secondary flex items-center gap-1 text-sm"
          >
            <Plus className="w-4 h-4" /> Aggiungi
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
          {error}
        </div>
      )}

      {saving && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Salvataggio in corso...
        </div>
      )}

      {/* Existing images grid */}
      {immagini.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {immagini.map((img, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={img}
                alt={`Immagine ${idx + 1}`}
                className="w-full h-32 object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                disabled={saving}
                className="absolute top-1.5 right-1.5 p-1 bg-white/90 hover:bg-red-50 border border-gray-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                title="Rimuovi"
              >
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                  Principale
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload new image */}
      {showUpload && (
        <div className="space-y-2">
          <ImageUpload
            value={null}
            onChange={handleNewImage}
            label=""
          />
          <button
            type="button"
            onClick={() => setShowUpload(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Annulla
          </button>
        </div>
      )}

      {immagini.length === 0 && !showUpload && (
        <p className="text-sm text-gray-400 text-center py-4">
          Nessuna immagine caricata. Aggiungi foto della struttura per il booking pubblico.
        </p>
      )}
    </div>
  )
}
