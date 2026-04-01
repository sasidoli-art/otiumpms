'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  CheckCircle2, Loader2, FileText, Shield, User,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { SignaturePad } from '@/components/spa/signature-pad'
import { cn } from '@/lib/utils'

interface HotelRegistrationCardProps {
  prenotazioneId: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  strutturaNome: string
  hostNome: string
  dataArrivo: string
  dataPartenza?: string | null
  numOspiti: number
  unitaNome?: string | null
  /** Custom T&C HTML (from host settings). Falls back to default if empty. */
  termsHtml?: string | null
  /** Custom privacy policy HTML */
  privacyHtml?: string | null
  onSuccess?: () => void
}

export function HotelRegistrationCard({
  prenotazioneId,
  guestNome,
  guestCognome,
  guestEmail,
  strutturaNome,
  hostNome,
  dataArrivo,
  dataPartenza,
  numOspiti,
  unitaNome,
  termsHtml,
  privacyHtml,
  onSuccess,
}: HotelRegistrationCardProps) {
  const t = useTranslations('regCard.hotel')
  const tc = useTranslations('common')

  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptMarketing, setAcceptMarketing] = useState(false)
  const [firma, setFirma] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = acceptTerms && acceptPrivacy && firma

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/checkin/${prenotazioneId}/registration-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'HOTEL',
          accettazioneTermini: acceptTerms,
          accettazionePrivacy: acceptPrivacy,
          consensoMarketing: acceptMarketing,
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

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <FileText className="w-7 h-7 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('title')}</h2>
        <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Guest summary */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <User size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{guestNome} {guestCognome}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>{t('structure')}: <strong className="text-slate-700 dark:text-slate-300">{strutturaNome}</strong></span>
          {unitaNome && <span>{t('room')}: <strong className="text-slate-700 dark:text-slate-300">{unitaNome}</strong></span>}
          <span>{t('arrival')}: <strong className="text-slate-700 dark:text-slate-300">{new Date(dataArrivo).toLocaleDateString('it-IT')}</strong></span>
          {dataPartenza && <span>{t('departure')}: <strong className="text-slate-700 dark:text-slate-300">{new Date(dataPartenza).toLocaleDateString('it-IT')}</strong></span>}
          <span>{t('guests')}: <strong className="text-slate-700 dark:text-slate-300">{numOspiti}</strong></span>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-3 mb-6">
        {/* T&C */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTerms(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-indigo-500" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">{t('termsTitle')}</span>
            </div>
            {showTerms ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </button>
          {showTerms && (
            <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
              {termsHtml ? (
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-60 overflow-y-auto" dangerouslySetInnerHTML={{ __html: termsHtml }} />
              ) : (
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
                  {t('defaultTerms')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Privacy */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPrivacy(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-green-500" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">{t('privacyTitle')}</span>
            </div>
            {showPrivacy ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </button>
          {showPrivacy && (
            <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
              {privacyHtml ? (
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-60 overflow-y-auto" dangerouslySetInnerHTML={{ __html: privacyHtml }} />
              ) : (
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
                  {t('defaultPrivacy')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          <span className="text-sm text-slate-700 dark:text-slate-300">{t('acceptTerms')} *</span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          <span className="text-sm text-slate-700 dark:text-slate-300">{t('acceptPrivacy')} *</span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={acceptMarketing} onChange={e => setAcceptMarketing(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-400 focus:ring-indigo-500" />
          <span className="text-sm text-slate-500">{t('acceptMarketing')}</span>
        </label>
      </div>

      {/* Signature */}
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('signature')} *</p>
        <SignaturePad onSave={(data) => setFirma(data)} />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        {loading ? tc('saving') : t('submit')}
      </button>
    </div>
  )
}
