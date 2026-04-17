'use client'

import {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
  type ForwardedRef,
} from 'react'
import { Camera, RotateCcw, Check, CreditCard, BookOpen, Car, Globe } from 'lucide-react'
import { PROVINCE_ITALIANE } from '@/lib/nazionalita'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DocumentoData {
  guestTipoDocumento: string
  guestNumeroDocumento: string
  guestLuogoRilascio: string
  guestComuneRilascioIstat: string
  guestProvinciaRilascio: string
  fotoDocumentoFronte: string | null // base64
  fotoDocumentoRetro: string | null  // base64
}

export interface StepDocumentoRef {
  validate: () => boolean
}

interface Props {
  prenotazione: {
    guestTipoDocumento?: string | null
    guestNumeroDocumento?: string | null
    guestLuogoRilascio?: string | null
    guestComuneRilascioIstat?: string | null
    guestProvinciaRilascio?: string | null
    fotoDocumentoFronte?: string | null
    fotoDocumentoRetro?: string | null
  }
  onChange: (data: Partial<DocumentoData>) => void
  accentColor?: string
}

const TIPI_DOC = [
  { id: 'IDENTE', label: "Carta d'identità", icon: CreditCard, hasRetro: true },
  { id: 'PPORT', label: 'Passaporto', icon: BookOpen, hasRetro: false },
  { id: 'PATEN', label: 'Patente', icon: Car, hasRetro: true },
  { id: 'PATEN_INT', label: 'Patente internazionale', icon: Globe, hasRetro: false },
]

// ─── Image compression ──────────────────────────────────────────────────────

function compressImage(file: File, maxSide = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width)
            width = maxSide
          } else {
            width = Math.round((width * maxSide) / height)
            height = maxSide
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Component ──────────────────────────────────────────────────────────────

const StepDocumento = forwardRef(function StepDocumento(
  { prenotazione: p, onChange, accentColor }: Props,
  ref: ForwardedRef<StepDocumentoRef>,
) {
  const accent = accentColor || '#4f46e5'

  const [form, setForm] = useState<DocumentoData>({
    guestTipoDocumento: p.guestTipoDocumento || '',
    guestNumeroDocumento: p.guestNumeroDocumento || '',
    guestLuogoRilascio: p.guestLuogoRilascio || '',
    guestComuneRilascioIstat: p.guestComuneRilascioIstat || '',
    guestProvinciaRilascio: p.guestProvinciaRilascio || '',
    fotoDocumentoFronte: p.fotoDocumentoFronte || null,
    fotoDocumentoRetro: p.fotoDocumentoRetro || null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [compressing, setCompressing] = useState<'fronte' | 'retro' | null>(null)
  const fronteRef = useRef<HTMLInputElement>(null)
  const retroRef = useRef<HTMLInputElement>(null)

  const set = useCallback((key: keyof DocumentoData, value: string | null) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      onChange(next)
      return next
    })
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }, [onChange])

  const handlePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, side: 'fronte' | 'retro') => {
    const file = e.target.files?.[0]
    if (!file) return

    setCompressing(side)
    try {
      const base64 = await compressImage(file)
      set(side === 'fronte' ? 'fotoDocumentoFronte' : 'fotoDocumentoRetro', base64)
    } catch {
      setErrors(prev => ({ ...prev, [`foto${side}`]: 'Errore nella compressione della foto' }))
    }
    setCompressing(null)
    e.target.value = '' // reset per permettere ri-scatto
  }, [set])

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    if (!form.guestTipoDocumento) e.guestTipoDocumento = 'Seleziona il tipo di documento'
    if (!form.guestNumeroDocumento.trim()) e.guestNumeroDocumento = 'Numero documento obbligatorio'
    if (!form.fotoDocumentoFronte) e.fotofronte = 'Foto fronte documento obbligatoria'
    if (!form.guestLuogoRilascio.trim()) e.guestLuogoRilascio = 'Luogo di rilascio obbligatorio'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [form])

  useImperativeHandle(ref, () => ({ validate }))

  const tipoDoc = TIPI_DOC.find(t => t.id === form.guestTipoDocumento)
  const needsRetro = tipoDoc?.hasRetro ?? false

  const inp = 'w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-gray-50 focus:bg-white transition-colors'
  const inpOk = 'border-gray-200 focus:ring-indigo-400'
  const inpErr = 'border-red-400 bg-red-50 focus:ring-red-400'
  const label = 'block text-xs font-semibold text-gray-700 mb-1.5'
  const errMsg = 'text-[10px] text-red-500 mt-1'

  return (
    <div className="space-y-6 pb-4">
      {/* ─── 1. Tipo documento ────────────────────────────────────── */}
      <div>
        <p className="text-sm font-bold text-gray-900 mb-1">Tipo di documento</p>
        <p className="text-xs text-gray-500 mb-4">Seleziona il documento che utilizzerai per il check-in.</p>

        <div className="grid grid-cols-2 gap-3">
          {TIPI_DOC.map(doc => {
            const Icon = doc.icon
            const isActive = form.guestTipoDocumento === doc.id
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  set('guestTipoDocumento', doc.id)
                  // Reset retro se il nuovo tipo non lo richiede
                  if (!doc.hasRetro) set('fotoDocumentoRetro', null)
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-h-[80px] ${
                  isActive
                    ? 'border-current shadow-md scale-[1.02]'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
                style={isActive ? { borderColor: accent, color: accent } : undefined}
              >
                <Icon className={`w-6 h-6 ${isActive ? '' : 'text-gray-400'}`} />
                <span className={`text-xs font-semibold text-center leading-tight ${isActive ? '' : 'text-gray-600'}`}>
                  {doc.label}
                </span>
              </button>
            )
          })}
        </div>
        {errors.guestTipoDocumento && <p className={errMsg}>{errors.guestTipoDocumento}</p>}
      </div>

      {/* ─── 2. Foto documento ────────────────────────────────────── */}
      {form.guestTipoDocumento && (
        <div>
          <p className="text-sm font-bold text-gray-900 mb-1">Foto del documento</p>
          <p className="text-xs text-gray-500 mb-4">
            Scatta una foto chiara del documento. Assicurati che tutti i dati siano leggibili.
          </p>

          <div className="space-y-3">
            {/* Fronte */}
            <PhotoCapture
              label="Fronte"
              photo={form.fotoDocumentoFronte}
              loading={compressing === 'fronte'}
              error={errors.fotofronte}
              inputRef={fronteRef}
              accent={accent}
              onCapture={e => handlePhoto(e, 'fronte')}
              onRemove={() => set('fotoDocumentoFronte', null)}
              onRetake={() => fronteRef.current?.click()}
            />

            {/* Retro (se richiesto) */}
            {needsRetro && (
              <PhotoCapture
                label="Retro"
                photo={form.fotoDocumentoRetro}
                loading={compressing === 'retro'}
                error={errors.fotoretro}
                inputRef={retroRef}
                accent={accent}
                onCapture={e => handlePhoto(e, 'retro')}
                onRemove={() => set('fotoDocumentoRetro', null)}
                onRetake={() => retroRef.current?.click()}
              />
            )}
          </div>
        </div>
      )}

      {/* ─── 3. Dati documento ────────────────────────────────────── */}
      {form.guestTipoDocumento && (
        <div>
          <p className="text-sm font-bold text-gray-900 mb-1">Dati del documento</p>
          <p className="text-xs text-gray-500 mb-4">Inserisci i dati come riportati sul documento.</p>

          <div className="space-y-3">
            <div>
              <label className={label}>Numero documento</label>
              <input
                type="text"
                value={form.guestNumeroDocumento}
                onChange={e => set('guestNumeroDocumento', e.target.value.toUpperCase())}
                placeholder="Es. CA12345AB"
                className={`${inp} ${errors.guestNumeroDocumento ? inpErr : inpOk} uppercase font-mono tracking-wider`}
              />
              {errors.guestNumeroDocumento && <p className={errMsg}>{errors.guestNumeroDocumento}</p>}
            </div>

            <div>
              <label className={label}>Luogo di rilascio</label>
              <input
                type="text"
                value={form.guestLuogoRilascio}
                onChange={e => set('guestLuogoRilascio', e.target.value)}
                placeholder="Es. Comune di Roma"
                className={`${inp} ${errors.guestLuogoRilascio ? inpErr : inpOk}`}
              />
              {errors.guestLuogoRilascio && <p className={errMsg}>{errors.guestLuogoRilascio}</p>}
            </div>

            <div>
              <label className={label}>Provincia di rilascio</label>
              <select
                value={form.guestProvinciaRilascio}
                onChange={e => set('guestProvinciaRilascio', e.target.value)}
                className={`${inp} ${inpOk}`}
              >
                <option value="">Seleziona provincia</option>
                {PROVINCE_ITALIANE.map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default StepDocumento

// ─── Sub-component: Photo Capture ───────────────────────────────────────────

function PhotoCapture({
  label, photo, loading, error, inputRef, accent,
  onCapture, onRemove, onRetake,
}: {
  label: string
  photo: string | null
  loading: boolean
  error?: string
  inputRef: React.RefObject<HTMLInputElement>
  accent: string
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
  onRetake: () => void
}) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onCapture}
        className="hidden"
      />

      {!photo ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Comprimo la foto...</span>
            </div>
          ) : (
            <>
              <Camera className="w-6 h-6 text-gray-400" />
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-700">Scatta foto {label.toLowerCase()}</p>
                <p className="text-[10px] text-gray-400">Tocca per aprire la fotocamera</p>
              </div>
            </>
          )}
        </button>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
          {/* Preview foto — proporzioni documento */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={`Documento ${label}`}
            className="w-full aspect-[3/2] object-cover"
          />

          {/* Badge "OK" */}
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-white text-[10px] font-bold"
            style={{ backgroundColor: accent }}
          >
            <Check className="w-3 h-3" /> {label}
          </div>

          {/* Azioni */}
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={onRetake}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-semibold text-gray-700 shadow-sm hover:bg-white"
            >
              <RotateCcw className="w-3 h-3" /> Riscatta
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}
