'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Loader2, ChevronRight, AlertCircle, FileText, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import DocumentOCR from './document-ocr'
import { SignaturePad } from '@/components/spa/signature-pad'

type Prenotazione = {
  id: string
  checkInCompletato: boolean
  regCardFirmata: boolean
  numOspiti: number
  guestSesso: string | null
  guestDataNascita: string | null
  guestLuogoNascita: string | null
  guestProvinciaNascita: string | null
  guestTipoDocumento: string | null
  guestNumeroDocumento: string | null
  guestLuogoRilascio: string | null
  guestProvinciaRilascio: string | null
  guestTelefono: string | null
}

type AccForm = {
  nome: string; cognome: string; sesso: string; dataNascita: string
  luogoNascita: string; provinciaNascita: string; nazionalita: string
  tipoDocumento: string; numeroDocumento: string; isMinore: boolean
}

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white transition-colors'

export default function CheckInPortaleForm({
  token,
  prenotazione: p,
}: {
  token: string
  prenotazione: Prenotazione
}) {
  const t = useTranslations('checkin')
  const tc = useTranslations('common')
  const td = useTranslations('docTypes')

  const TIPI_DOC = [
    { value: 'IDENTE', label: td('idCard') },
    { value: 'PPORT', label: td('passport') },
    { value: 'PATEN', label: td('drivingLicense') },
    { value: 'PERMSOS', label: td('residencePermit') },
  ]

  const tr = useTranslations('regCard.hotel')

  const [step, setStep] = useState<'data' | 'regcard' | 'done'>(
    p.checkInCompletato ? 'done' : 'data'
  )
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [accompagnatori, setAccompagnatori] = useState<AccForm[]>([])

  // Registration card state
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptMarketing, setAcceptMarketing] = useState(false)
  const [firma, setFirma] = useState<string | null>(null)

  const emptyAcc = (): AccForm => ({
    nome: '', cognome: '', sesso: 'M', dataNascita: '', luogoNascita: '',
    provinciaNascita: '', nazionalita: 'Italiana', tipoDocumento: 'IDENTE',
    numeroDocumento: '', isMinore: false,
  })

  function addAcc() { setAccompagnatori(a => [...a, emptyAcc()]) }
  function removeAcc(i: number) { setAccompagnatori(a => a.filter((_, idx) => idx !== i)) }
  function setAcc(i: number, field: string, value: string | boolean) {
    setAccompagnatori(a => a.map((acc, idx) => idx === i ? { ...acc, [field]: value } : acc))
  }

  const [form, setForm] = useState({
    guestSesso: p.guestSesso ?? 'M',
    guestDataNascita: p.guestDataNascita ? p.guestDataNascita.split('T')[0] : '',
    guestLuogoNascita: p.guestLuogoNascita ?? '',
    guestProvinciaNascita: p.guestProvinciaNascita ?? '',
    guestStatoNascitaIstat: '100000100',
    guestCittadinanzaIstat: '100000100',
    guestTipoDocumento: p.guestTipoDocumento ?? 'IDENTE',
    guestNumeroDocumento: p.guestNumeroDocumento ?? '',
    guestLuogoRilascio: p.guestLuogoRilascio ?? '',
    guestProvinciaRilascio: p.guestProvinciaRilascio ?? '',
    guestStatoRilascioIstat: '100000100',
    guestTelefono: p.guestTelefono ?? '',
  })

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleOCRExtract(data: { guestTipoDocumento?: string; guestNumeroDocumento?: string; guestDataNascita?: string; guestLuogoNascita?: string }) {
    if (data.guestTipoDocumento) set('guestTipoDocumento', data.guestTipoDocumento)
    if (data.guestNumeroDocumento) set('guestNumeroDocumento', data.guestNumeroDocumento)
    if (data.guestDataNascita) set('guestDataNascita', data.guestDataNascita)
    if (data.guestLuogoNascita) set('guestLuogoNascita', data.guestLuogoNascita)
  }

  async function handleSubmitData(e: React.FormEvent) {
    e.preventDefault()
    if (!form.guestTipoDocumento || !form.guestNumeroDocumento.trim()) {
      setErrore(t('docRequired'))
      return
    }
    setLoading(true); setErrore('')
    const res = await fetch(`/api/checkin/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        accompagnatori: accompagnatori.filter(a => a.nome && a.cognome),
      }),
    })
    if (!res.ok) {
      const j = await res.json()
      setErrore(j.error ?? t('submitError'))
      setLoading(false)
      return
    }
    setLoading(false)
    // Go to registration card step
    setStep('regcard')
    setErrore('')
  }

  async function handleSubmitRegCard() {
    if (!acceptTerms || !acceptPrivacy || !firma) return
    setLoading(true); setErrore('')
    const res = await fetch(`/api/checkin/${token}/registration-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accettazioneTermini: acceptTerms,
        accettazionePrivacy: acceptPrivacy,
        consensoMarketing: acceptMarketing,
        firmaBase64: firma,
      }),
    })
    if (!res.ok) {
      const j = await res.json()
      setErrore(j.error ?? tc('unexpectedError'))
      setLoading(false)
      return
    }
    setStep('done')
    setLoading(false)
  }

  if (step === 'done') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('completed')}</h2>
        <p className="text-sm text-gray-500">
          {t('dataSubmitted')}<br />
          {t('seeYou')}
        </p>
      </div>
    )
  }

  // ═══ Step 2: Registration Card ═══
  if (step === 'regcard') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{tr('title')}</h2>
          <p className="text-sm text-gray-400 mt-1">{tr('subtitle')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-50 border border-green-300 text-xs font-medium text-green-600">
            <CheckCircle2 size={12} /> {t('complete').split(' ')[0]}
          </div>
          <div className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-50 border border-indigo-300 text-xs font-medium text-indigo-600">
            <FileText size={12} /> {tr('title')}
          </div>
        </div>

        {/* Terms */}
        <div className="space-y-3 mb-6">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setShowTerms(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left" type="button">
              <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <FileText size={14} className="text-indigo-500" /> {tr('termsTitle')}
              </span>
              {showTerms ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {showTerms && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 text-xs text-gray-600 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
                {tr('defaultTerms')}
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setShowPrivacy(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left" type="button">
              <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Shield size={14} className="text-green-500" /> {tr('privacyTitle')}
              </span>
              {showPrivacy ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {showPrivacy && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 text-xs text-gray-600 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
                {tr('defaultPrivacy')}
              </div>
            )}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-gray-700">{tr('acceptTerms')} *</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-gray-700">{tr('acceptPrivacy')} *</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptMarketing} onChange={e => setAcceptMarketing(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 text-gray-400 focus:ring-indigo-500" />
            <span className="text-sm text-gray-500">{tr('acceptMarketing')}</span>
          </label>
        </div>

        {/* Signature */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">{tr('signature')} *</p>
          <SignaturePad onSave={(data) => setFirma(data)} />
        </div>

        {errore && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errore}
          </div>
        )}

        <button
          onClick={handleSubmitRegCard}
          disabled={!acceptTerms || !acceptPrivacy || !firma || loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {loading ? tc('saving') : tr('submit')}
        </button>
      </div>
    )
  }

  // ═══ Step 1: Personal Data ═══
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">{t('complete')}</h2>
      <p className="text-sm text-gray-400 mb-5">
        {t('subtitle')}
      </p>

      {errore && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errore}
        </div>
      )}

      <form onSubmit={handleSubmitData} className="space-y-4">
        {/* Telefono */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">{tc('phone')}</label>
          <input type="tel" value={form.guestTelefono} onChange={e => set('guestTelefono', e.target.value)} className={inp} placeholder="+39 333 1234567" />
        </div>

        {/* Sesso */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('sex')}</label>
          <div className="flex gap-3">
            {[{ v: 'M', l: t('male') }, { v: 'F', l: t('female') }].map(({ v, l }) => (
              <button
                key={v} type="button"
                onClick={() => set('guestSesso', v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.guestSesso === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-indigo-50'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Data nascita + luogo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('dateOfBirth')}</label>
            <input type="date" value={form.guestDataNascita} onChange={e => set('guestDataNascita', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('birthProvince')}</label>
            <input type="text" value={form.guestProvinciaNascita} onChange={e => set('guestProvinciaNascita', e.target.value.toUpperCase())} maxLength={2} className={inp} placeholder="RM" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('birthCity')}</label>
          <input type="text" value={form.guestLuogoNascita} onChange={e => set('guestLuogoNascita', e.target.value)} className={inp} placeholder="Roma" />
        </div>

        {/* Documento */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3">{t('idDocument')}</p>

          {/* OCR Scanner */}
          <div className="mb-4 p-4 bg-indigo-50 rounded-xl">
            <p className="text-xs font-medium text-indigo-700 mb-3">{t('extractAuto')}</p>
            <DocumentOCR onExtract={handleOCRExtract} />
          </div>

          {/* Tipo documento */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {TIPI_DOC.map(({ value, label }) => (
              <button
                key={value} type="button"
                onClick={() => set('guestTipoDocumento', value)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors text-left ${form.guestTipoDocumento === value ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-indigo-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('documentNumber')}</label>
            <input type="text" value={form.guestNumeroDocumento} onChange={e => set('guestNumeroDocumento', e.target.value.toUpperCase())} required className={inp} placeholder="AB1234567" />
          </div>
        </div>

        {/* Luogo rilascio */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('issuedAt')}</label>
            <input type="text" value={form.guestLuogoRilascio} onChange={e => set('guestLuogoRilascio', e.target.value)} className={inp} placeholder="Roma" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('issueProvince')}</label>
            <input type="text" value={form.guestProvinciaRilascio} onChange={e => set('guestProvinciaRilascio', e.target.value.toUpperCase())} maxLength={2} className={inp} placeholder="RM" />
          </div>
        </div>

        {/* Accompagnatori */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500">
              {t('companions')}{accompagnatori.length > 0 ? ` (${accompagnatori.length})` : ''}
            </p>
            <button type="button" onClick={addAcc} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              {t('addPerson')}
            </button>
          </div>

          {accompagnatori.length === 0 && (
            <p className="text-xs text-gray-400 italic mb-2">{t('companionsNote')}</p>
          )}

          {accompagnatori.map((acc, i) => (
            <div key={i} className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">{t('companion')} {i + 1}</p>
                <button type="button" onClick={() => removeAcc(i)} className="text-xs text-red-400 hover:text-red-600">{tc('remove')}</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">{tc('name')} *</label>
                  <input type="text" value={acc.nome} onChange={e => setAcc(i, 'nome', e.target.value)} className={inp} required />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">{tc('surname')} *</label>
                  <input type="text" value={acc.cognome} onChange={e => setAcc(i, 'cognome', e.target.value)} className={inp} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">{t('sex')}</label>
                  <select value={acc.sesso} onChange={e => setAcc(i, 'sesso', e.target.value)} className={inp}>
                    <option value="M">M</option><option value="F">F</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">{t('dateOfBirth')}</label>
                  <input type="date" value={acc.dataNascita} onChange={e => setAcc(i, 'dataNascita', e.target.value)} className={inp} />
                </div>
                <div>
                  {/* TODO: i18n */}
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Nazionalità</label>
                  <input type="text" value={acc.nazionalita} onChange={e => setAcc(i, 'nazionalita', e.target.value)} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  {/* TODO: i18n */}
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Documento</label>
                  <select value={acc.tipoDocumento} onChange={e => setAcc(i, 'tipoDocumento', e.target.value)} className={inp}>
                    {TIPI_DOC.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  {/* TODO: i18n */}
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Numero doc.</label>
                  <input type="text" value={acc.numeroDocumento} onChange={e => setAcc(i, 'numeroDocumento', e.target.value.toUpperCase())} className={inp} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={acc.isMinore} onChange={e => setAcc(i, 'isMinore', e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                {/* TODO: i18n */}
                <span className="text-xs text-gray-600">Minore di 18 anni</span>
              </label>
            </div>
          ))}
        </div>

        {/* Avviso obbligo legale */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
          {/* TODO: i18n - legal notice */}
          <p className="font-semibold mb-1">Obbligo di identificazione</p>
          <p>
            Ai sensi dell&apos;art. 109 del T.U.L.P.S. (R.D. 773/1931), tutti gli ospiti sono tenuti
            a presentare un documento di identit&agrave; valido al momento dell&apos;arrivo in struttura.
            Il check-in online non sostituisce l&apos;identificazione in reception.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm mt-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          {/* TODO: i18n */}
          {loading ? 'Invio in corso…' : 'Conferma check-in'}
        </button>
      </form>
    </div>
  )
}
