'use client'

import {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type ForwardedRef,
} from 'react'
import { SignaturePad } from '@/components/spa/signature-pad'
import { Shield, FileText, Calendar, Home, Users, Check } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FirmaData {
  firmaBase64: string | null
  accTermini: boolean
  accPrivacy: boolean
  accMarketing: boolean
  campiExtra: Record<string, string | boolean>
}

export interface StepFirmaRef {
  validate: () => boolean
}

interface CampoExtra {
  label: string
  type: 'text' | 'checkbox' | 'select'
  required?: boolean
  options?: string[]
}

interface Props {
  prenotazione: {
    guestNome: string
    guestCognome: string
    dataArrivo: string
    dataPartenza?: string | null
    numOspiti: number
    unitaNome?: string | null
    strutturaNome?: string
  }
  accompagnatori?: { nome: string; cognome: string }[]
  regCardTerminiHtml?: string | null
  regCardPrivacyHtml?: string | null
  regCardCampiExtra?: CampoExtra[] | null
  onChange: (data: Partial<FirmaData>) => void
  accentColor?: string
}

// ─── Default texts ──────────────────────────────────────────────────────────

const DEFAULT_TERMINI = `<p>Il sottoscritto, ospite presso la struttura, dichiara di aver preso visione delle condizioni generali di soggiorno e del regolamento interno.</p>
<p>Si impegna a rispettare le regole della struttura, gli orari di check-in (dalle 15:00) e check-out (entro le 10:00), e a comunicare tempestivamente eventuali danni o anomalie riscontrate durante il soggiorno.</p>
<p>La struttura si riserva il diritto di addebitare eventuali danni causati all'immobile o agli arredi durante la permanenza.</p>`

const DEFAULT_PRIVACY = `<p>Ai sensi del Regolamento UE 2016/679 (GDPR), informiamo che i dati personali raccolti saranno trattati per le seguenti finalità:</p>
<ul><li>Gestione della prenotazione e del soggiorno</li><li>Adempimenti di legge (Art. 109 TULPS — comunicazione alle autorità di PS)</li><li>Fatturazione e contabilità</li></ul>
<p>I dati saranno conservati per il periodo previsto dalla normativa vigente. Il titolare del trattamento è la struttura ospitante.</p>`

// ─── Component ──────────────────────────────────────────────────────────────

const StepFirma = forwardRef(function StepFirma(
  { prenotazione: p, accompagnatori, regCardTerminiHtml, regCardPrivacyHtml, regCardCampiExtra, onChange, accentColor }: Props,
  ref: ForwardedRef<StepFirmaRef>,
) {
  const accent = accentColor || '#4f46e5'

  const [firma, setFirma] = useState<string | null>(null)
  const [accTermini, setAccTermini] = useState(false)
  const [accPrivacy, setAccPrivacy] = useState(false)
  const [accMarketing, setAccMarketing] = useState(false)
  const [campiExtra, setCampiExtra] = useState<Record<string, string | boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const campiExtraList: CampoExtra[] = regCardCampiExtra || []

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    if (!firma) e.firma = 'La firma è obbligatoria'
    if (!accTermini) e.accTermini = 'Devi accettare i termini e condizioni'
    if (!accPrivacy) e.accPrivacy = 'Devi accettare la privacy policy'
    // Campi extra required
    for (const campo of campiExtraList) {
      if (campo.required && !campiExtra[campo.label]) {
        e[`extra-${campo.label}`] = `${campo.label} è obbligatorio`
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }, [firma, accTermini, accPrivacy, campiExtraList, campiExtra])

  useImperativeHandle(ref, () => ({ validate }))

  const handleFirma = useCallback((base64: string) => {
    setFirma(base64)
    onChange({ firmaBase64: base64 })
    setErrors(prev => { const n = { ...prev }; delete n.firma; return n })
  }, [onChange])

  const handleClearFirma = useCallback(() => {
    setFirma(null)
    onChange({ firmaBase64: null })
  }, [onChange])

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })
    } catch { return iso }
  }

  return (
    <div className="space-y-5 pb-4">
      {/* ─── 1. Riepilogo dati (read-only) ─────────────────────── */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Riepilogo soggiorno</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span><strong>{p.guestNome} {p.guestCognome}</strong></span>
          </div>
          {p.unitaNome && (
            <div className="flex items-center gap-2 text-gray-700">
              <Home className="w-3.5 h-3.5 text-gray-400" />
              <span>{p.unitaNome}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>{fmtDate(p.dataArrivo)}</span>
          </div>
          {p.dataPartenza && (
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{fmtDate(p.dataPartenza)}</span>
            </div>
          )}
        </div>
        {accompagnatori && accompagnatori.length > 0 && (
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="text-[10px] text-gray-500 mb-1">Accompagnatori:</p>
            {accompagnatori.map((a, i) => (
              <p key={i} className="text-xs text-gray-700">· {a.nome} {a.cognome}</p>
            ))}
          </div>
        )}
      </div>

      {/* ─── 2. Termini e condizioni ───────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-bold text-gray-900">Termini e condizioni</p>
        </div>
        <div
          className="bg-white rounded-xl p-4 text-xs text-gray-600 leading-relaxed max-h-36 overflow-y-auto border border-gray-200 prose prose-xs prose-gray"
          dangerouslySetInnerHTML={{ __html: regCardTerminiHtml || DEFAULT_TERMINI }}
        />
        <label className={`flex items-start gap-3 cursor-pointer p-3 mt-2 rounded-xl border transition-colors ${
          accTermini ? 'border-green-200 bg-green-50/50' : errors.accTermini ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
        }`}>
          <input
            type="checkbox" checked={accTermini}
            onChange={e => { setAccTermini(e.target.checked); onChange({ accTermini: e.target.checked }); setErrors(prev => { const n = { ...prev }; delete n.accTermini; return n }) }}
            className="mt-0.5 w-5 h-5 rounded shrink-0" style={{ accentColor: accent }}
          />
          <p className="text-sm font-medium text-gray-800">Accetto i termini e condizioni *</p>
        </label>
        {errors.accTermini && <p className="text-[10px] text-red-500 ml-3 mt-1">{errors.accTermini}</p>}
      </div>

      {/* ─── 3. Privacy policy ─────────────────────────────────── */}
      <div>
        <div
          className="bg-white rounded-xl p-4 text-xs text-gray-600 leading-relaxed max-h-28 overflow-y-auto border border-gray-200 prose prose-xs prose-gray"
          dangerouslySetInnerHTML={{ __html: regCardPrivacyHtml || DEFAULT_PRIVACY }}
        />
        <label className={`flex items-start gap-3 cursor-pointer p-3 mt-2 rounded-xl border transition-colors ${
          accPrivacy ? 'border-green-200 bg-green-50/50' : errors.accPrivacy ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
        }`}>
          <input
            type="checkbox" checked={accPrivacy}
            onChange={e => { setAccPrivacy(e.target.checked); onChange({ accPrivacy: e.target.checked }); setErrors(prev => { const n = { ...prev }; delete n.accPrivacy; return n }) }}
            className="mt-0.5 w-5 h-5 rounded shrink-0" style={{ accentColor: accent }}
          />
          <p className="text-sm font-medium text-gray-800">Accetto l&apos;informativa privacy *</p>
        </label>
        {errors.accPrivacy && <p className="text-[10px] text-red-500 ml-3 mt-1">{errors.accPrivacy}</p>}

        <label className="flex items-start gap-3 cursor-pointer p-3 mt-2 rounded-xl border border-gray-200">
          <input
            type="checkbox" checked={accMarketing}
            onChange={e => { setAccMarketing(e.target.checked); onChange({ accMarketing: e.target.checked }) }}
            className="mt-0.5 w-5 h-5 rounded shrink-0" style={{ accentColor: accent }}
          />
          <div>
            <p className="text-sm font-medium text-gray-800">Comunicazioni marketing</p>
            <p className="text-[10px] text-gray-500">Ricevi offerte e novità dalla struttura (opzionale)</p>
          </div>
        </label>
      </div>

      {/* ─── 4. Campi extra dinamici ───────────────────────────── */}
      {campiExtraList.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-gray-900">Informazioni aggiuntive</p>
          {campiExtraList.map(campo => (
            <div key={campo.label}>
              {campo.type === 'checkbox' ? (
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    checked={!!campiExtra[campo.label]}
                    onChange={e => {
                      const next = { ...campiExtra, [campo.label]: e.target.checked }
                      setCampiExtra(next)
                      onChange({ campiExtra: next })
                    }}
                    className="mt-0.5 w-5 h-5 rounded shrink-0" style={{ accentColor: accent }}
                  />
                  <p className="text-sm text-gray-800">{campo.label} {campo.required && '*'}</p>
                </label>
              ) : campo.type === 'select' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{campo.label} {campo.required && '*'}</label>
                  <select
                    value={String(campiExtra[campo.label] || '')}
                    onChange={e => {
                      const next = { ...campiExtra, [campo.label]: e.target.value }
                      setCampiExtra(next)
                      onChange({ campiExtra: next })
                    }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Seleziona...</option>
                    {campo.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{campo.label} {campo.required && '*'}</label>
                  <input
                    type="text"
                    value={String(campiExtra[campo.label] || '')}
                    onChange={e => {
                      const next = { ...campiExtra, [campo.label]: e.target.value }
                      setCampiExtra(next)
                      onChange({ campiExtra: next })
                    }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}
              {errors[`extra-${campo.label}`] && <p className="text-[10px] text-red-500 mt-1">{errors[`extra-${campo.label}`]}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ─── 5. Firma digitale ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-bold text-gray-900">La tua firma</p>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Firma nel riquadro qui sotto con il dito o il mouse.
        </p>

        <div className={`border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
          errors.firma ? 'border-red-300' : firma ? 'border-green-300' : 'border-gray-300'
        }`}>
          <SignaturePad
            onSave={handleFirma}
            onClear={handleClearFirma}
          />
        </div>
        {errors.firma && <p className="text-[10px] text-red-500 mt-1">{errors.firma}</p>}
        {firma && (
          <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
            <Check className="w-3 h-3" /> Firma acquisita correttamente
          </p>
        )}
      </div>
    </div>
  )
})

export default StepFirma
