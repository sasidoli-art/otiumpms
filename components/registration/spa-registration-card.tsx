'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  CheckCircle2, Loader2, Waves, Shield, Heart,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react'
import { SignaturePad } from '@/components/spa/signature-pad'
import { BodyMap } from '@/components/spa/body-map'
import { cn } from '@/lib/utils'

interface SpaRegistrationCardProps {
  appuntamentoId: string
  guestNome: string
  trattamentoNome: string
  terapistaNome?: string | null
  dataOra: string
  durata: number
  strutturaNome: string
  hostNome: string
  /** Custom SPA T&C HTML (from host settings). Falls back to default if empty. */
  termsHtml?: string | null
  onSuccess?: () => void
}

export function SpaRegistrationCard({
  appuntamentoId,
  guestNome,
  trattamentoNome,
  terapistaNome,
  dataOra,
  durata,
  strutturaNome,
  hostNome,
  termsHtml,
  onSuccess,
}: SpaRegistrationCardProps) {
  const t = useTranslations('regCard.spa')
  const tc = useTranslations('common')

  const [step, setStep] = useState(0) // 0=health, 1=terms, 2=sign
  const [showTerms, setShowTerms] = useState(false)

  // Health form
  const [incinta, setIncinta] = useState(false)
  const [incintaMesi, setIncintaMesi] = useState('')
  const [condizioni, setCondizioni] = useState<string[]>([])
  const [allergie, setAllergie] = useState('')
  const [farmaci, setFarmaci] = useState('')
  const [patologieNote, setPatologieNote] = useState('')
  const [zoneTrattate, setZoneTrattate] = useState<string[]>([])
  const [zoneEvitare, setZoneEvitare] = useState<string[]>([])
  const [pressione, setPressione] = useState<'leggera' | 'media' | 'forte'>('media')

  // Consent
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptRisk, setAcceptRisk] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [firma, setFirma] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const CONDIZIONI = [
    { id: 'pressione_alta', label: t('conditions.highBP'), icon: '🩺' },
    { id: 'pressione_bassa', label: t('conditions.lowBP'), icon: '🩺' },
    { id: 'cardiaci', label: t('conditions.heart'), icon: '❤️' },
    { id: 'diabete', label: t('conditions.diabetes'), icon: '💉' },
    { id: 'epilessia', label: t('conditions.epilepsy'), icon: '⚡' },
    { id: 'circolatori', label: t('conditions.circulatory'), icon: '🦵' },
    { id: 'schiena', label: t('conditions.back'), icon: '🔴' },
    { id: 'artrite', label: t('conditions.arthritis'), icon: '🦴' },
    { id: 'cutanei', label: t('conditions.skin'), icon: '🧴' },
    { id: 'chirurgia', label: t('conditions.surgery'), icon: '🏥' },
    { id: 'trombosi', label: t('conditions.thrombosis'), icon: '🩸' },
    { id: 'gravidanza_recente', label: t('conditions.recentPregnancy'), icon: '👶' },
  ]

  function toggleCondizione(id: string) {
    setCondizioni(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id])
  }

  const canSubmit = acceptTerms && acceptRisk && acceptPrivacy && firma

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/spa/registration-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appuntamentoId,
          // Health data
          incinta,
          incintaMesi: incinta ? parseInt(incintaMesi) || null : null,
          condizioni,
          allergie: allergie.trim() || null,
          farmaci: farmaci.trim() || null,
          patologieNote: patologieNote.trim() || null,
          zoneTrattate,
          zoneEvitare,
          pressionePreferita: pressione,
          // Consent
          accettazioneTermini: acceptTerms,
          accettazioneRischio: acceptRisk,
          accettazionePrivacy: acceptPrivacy,
          firmaBase64: firma,
        }),
      })

      if (res.ok) {
        setDone(true)
        onSuccess?.()
      } else {
        const data = await res.json()
        setError(data.error || tc('unexpectedError'))
      }
    } catch {
      setError(tc('networkError'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
        <p className="text-lg font-bold text-slate-900 dark:text-white">{t('completed')}</p>
        <p className="text-sm text-slate-500 mt-1">{t('completedDesc')}</p>
      </div>
    )
  }

  const STEPS = [
    { label: t('steps.health'), icon: <Heart size={14} /> },
    { label: t('steps.terms'), icon: <Shield size={14} /> },
    { label: t('steps.sign'), icon: <CheckCircle2 size={14} /> },
  ]

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-teal-100 dark:bg-teal-900/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Waves className="w-7 h-7 text-teal-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('title')}</h2>
        <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Appointment summary */}
      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 mb-6 border border-teal-200 dark:border-teal-800">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
          <span>{t('guest')}: <strong className="text-slate-800 dark:text-slate-200">{guestNome}</strong></span>
          <span>{t('treatment')}: <strong className="text-slate-800 dark:text-slate-200">{trattamentoNome}</strong></span>
          <span>{t('dateTime')}: <strong className="text-slate-800 dark:text-slate-200">{new Date(dataOra).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong></span>
          <span>{t('duration')}: <strong className="text-slate-800 dark:text-slate-200">{durata} min</strong></span>
          {terapistaNome && <span>{t('therapist')}: <strong className="text-slate-800 dark:text-slate-200">{terapistaNome}</strong></span>}
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => i <= step && setStep(i)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border',
              i === step ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/30 text-teal-700' :
              i < step ? 'border-green-300 bg-green-50 text-green-600' :
              'border-slate-200 dark:border-slate-700 text-slate-400'
            )}
          >
            {i < step ? <CheckCircle2 size={12} /> : s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══ Step 0: Health Assessment ═══ */}
      {step === 0 && (
        <div className="space-y-5">
          {/* Pregnancy */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={incinta} onChange={e => setIncinta(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('pregnant')}</span>
            </label>
            {incinta && (
              <input
                type="number" min={1} max={9} value={incintaMesi}
                onChange={e => setIncintaMesi(e.target.value)}
                placeholder={t('pregnantMonths')}
                className="mt-2 ml-7 w-40 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
              />
            )}
          </div>

          {/* Medical conditions */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('medicalConditions')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {CONDIZIONI.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCondizione(c.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all text-left',
                    condizioni.includes(c.id)
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Allergies + Medications */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('allergies')}</label>
              <textarea rows={2} value={allergie} onChange={e => setAllergie(e.target.value)}
                placeholder={t('allergiesPlaceholder')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('medications')}</label>
              <textarea rows={2} value={farmaci} onChange={e => setFarmaci(e.target.value)}
                placeholder={t('medicationsPlaceholder')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 resize-none" />
            </div>
          </div>

          {/* Pressure preference */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('pressurePreference')}</p>
            <div className="flex gap-2">
              {(['leggera', 'media', 'forte'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPressione(p)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-medium border transition-all',
                    pressione === p ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  )}
                >
                  {t(`pressure.${p}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Body map zones */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('bodyZones')}</p>
            <p className="text-xs text-slate-500 mb-3">{t('bodyZonesDesc')}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">✅ Zone da trattare</p>
                <BodyMap
                  zoneSelezionate={zoneTrattate}
                  onChange={setZoneTrattate}
                  tipo="trattate"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-red-600 mb-1">🚫 Zone da evitare</p>
                <BodyMap
                  zoneSelezionate={zoneEvitare}
                  onChange={setZoneEvitare}
                  tipo="evitare"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            {tc('next')} →
          </button>
        </div>
      )}

      {/* ═══ Step 1: Terms & Consent ═══ */}
      {step === 1 && (
        <div className="space-y-4">
          {/* SPA Terms */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button onClick={() => setShowTerms(v => !v)} className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Waves size={14} className="text-teal-500" /> {t('spaTermsTitle')}
              </span>
              {showTerms ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTerms && (
              <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                {termsHtml ? (
                  <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-60 overflow-y-auto" dangerouslySetInnerHTML={{ __html: termsHtml }} />
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">{t('defaultSpaTerms')}</div>
                )}
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('acceptSpaTerms')} *</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptRisk} onChange={e => setAcceptRisk(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('acceptRisk')} *</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('acceptPrivacy')} *</span>
            </label>
          </div>

          {condizioni.length > 0 && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{t('medicalWarning')}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              ← {tc('back')}
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!acceptTerms || !acceptRisk || !acceptPrivacy}
              className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {tc('next')} →
            </button>
          </div>
        </div>
      )}

      {/* ═══ Step 2: Signature ═══ */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('signatureTitle')}</p>
            <p className="text-xs text-slate-500 mb-3">{t('signatureDesc')}</p>
            <SignaturePad onSave={(data) => setFirma(data)} />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              ← {tc('back')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {loading ? tc('saving') : t('submit')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
