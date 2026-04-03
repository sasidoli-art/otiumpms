'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, AlertCircle, Loader, Heart, Shield, Sparkles,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { SignaturePad } from './signature-pad'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaiverSpaFormProps {
  appuntamentoId: string
  guestName: string
  trattamento: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WaiverSpaForm({
  appuntamentoId,
  guestName,
  trattamento,
  onSuccess,
  onError,
}: WaiverSpaFormProps) {
  const t = useTranslations('spa.waiverForm')
  const tb = useTranslations('spa.bodyMap')
  const tc = useTranslations('common')

  // ─── Config (translated) ───────────────────────────────────────────────
  const CONDIZIONI_SALUTE = [
    { id: 'pressione_alta', label: t('conditions.highBloodPressure'), icon: '🩺' },
    { id: 'pressione_bassa', label: t('conditions.lowBloodPressure'), icon: '🩺' },
    { id: 'problemi_cardiaci', label: t('conditions.heartProblems'), icon: '❤️' },
    { id: 'diabete', label: t('conditions.diabetes'), icon: '💉' },
    { id: 'epilessia', label: t('conditions.epilepsy'), icon: '⚡' },
    { id: 'problemi_circolatori', label: t('conditions.circulatory'), icon: '🦵' },
    { id: 'ernia_disco', label: t('conditions.discHernia'), icon: '🔴' },
    { id: 'artrite', label: t('conditions.arthritis'), icon: '🦴' },
    { id: 'problemi_cutanei', label: t('conditions.skinProblems'), icon: '🧴' },
    { id: 'operazioni_recenti', label: t('conditions.recentSurgery'), icon: '🏥' },
  ] as const

  const ALLERGIE_COMUNI = [
    { id: 'lattice', label: t('allergies.latex') },
    { id: 'oli_essenziali', label: t('allergies.essentialOils') },
    { id: 'profumi', label: t('allergies.fragrances') },
    { id: 'nichel', label: t('allergies.nickel') },
  ] as const

  const ZONE_EVITARE = [
    { id: 'testa', label: tb('head') },
    { id: 'viso', label: tb('face') },
    { id: 'collo', label: tb('neck') },
    { id: 'spalle', label: tb('shoulders') },
    { id: 'schiena', label: tb('back') },
    { id: 'petto', label: tb('chest') },
    { id: 'addome', label: tb('abdomen') },
    { id: 'braccia', label: tb('arms') },
    { id: 'mani', label: tb('hands') },
    { id: 'gambe', label: tb('legs') },
    { id: 'piedi', label: tb('feet') },
  ] as const

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [firma, setFirma] = useState<string | null>(null)
  const [expandZone, setExpandZone] = useState(false)

  const [form, setForm] = useState({
    dichiarazioneNessuna: false,
    condizioni: [] as string[],
    condizioneAltro: '',
    incinta: false,
    incintaMesi: undefined as number | undefined,
    allergieSelezionate: [] as string[],
    allergieAltro: '',
    farmaci: '',
    zoneEvitare: [] as string[],
    pressioneMassaggio: '' as string,
    temperaturaPreferita: '' as string,
    musicaPreferita: '' as string,
    aromiPreferiti: '' as string,
    notePreferenze: '',
    accettazioneTermini: false,
    accettazionePrivacy: false,
    consensoFoto: false,
  })

  const haCondizioni = form.condizioni.length > 0 || form.incinta || form.condizioneAltro.trim().length > 0
  const haAllergie = form.allergieSelezionate.length > 0 || form.allergieAltro.trim().length > 0
  const richiedeFirma = haCondizioni || haAllergie || form.incinta

  function toggleCondizione(id: string) {
    setForm(f => ({
      ...f,
      condizioni: f.condizioni.includes(id)
        ? f.condizioni.filter(c => c !== id)
        : [...f.condizioni, id],
      dichiarazioneNessuna: false,
    }))
  }

  function toggleAllergia(id: string) {
    setForm(f => ({
      ...f,
      allergieSelezionate: f.allergieSelezionate.includes(id)
        ? f.allergieSelezionate.filter(a => a !== id)
        : [...f.allergieSelezionate, id],
    }))
  }

  function toggleZonaEvitare(id: string) {
    setForm(f => ({
      ...f,
      zoneEvitare: f.zoneEvitare.includes(id)
        ? f.zoneEvitare.filter(z => z !== id)
        : [...f.zoneEvitare, id],
    }))
  }

  function setNessuna(checked: boolean) {
    setForm(f => ({
      ...f,
      dichiarazioneNessuna: checked,
      condizioni: checked ? [] : f.condizioni,
      condizioneAltro: checked ? '' : f.condizioneAltro,
      incinta: checked ? false : f.incinta,
      incintaMesi: checked ? undefined : f.incintaMesi,
      allergieSelezionate: checked ? [] : f.allergieSelezionate,
      allergieAltro: checked ? '' : f.allergieAltro,
    }))
  }

  async function handleSubmit() {
    if (!form.accettazioneTermini || !form.accettazionePrivacy) {
      onError?.(t('termsRequired'))
      return
    }
    if (richiedeFirma && !firma) {
      onError?.(t('signatureRequired'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/spa/waiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appuntamentoId,
          firmaBase64: firma,
          condizioni: form.condizioni,
          condizioneAltro: form.condizioneAltro || null,
          incinta: form.incinta,
          incintaMesi: form.incintaMesi || null,
          allergieSelezionate: form.allergieSelezionate,
          allergieAltro: form.allergieAltro || null,
          farmaci: form.farmaci || null,
          zoneEvitare: form.zoneEvitare,
          zoneTrattate: [],
          pressioneMassaggio: form.pressioneMassaggio || null,
          temperaturaPreferita: form.temperaturaPreferita || null,
          musicaPreferita: form.musicaPreferita || null,
          aromiPreferiti: form.aromiPreferiti || null,
          notePreferenze: form.notePreferenze || null,
          accettazioneTermini: form.accettazioneTermini,
          accettazionePrivacy: form.accettazionePrivacy,
          consensoFoto: form.consensoFoto,
          dichiarazioneNessuna: form.dichiarazioneNessuna,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || tc('unexpectedError'))
      }
      onSuccess?.()
    } catch (error) {
      onError?.(error instanceof Error ? error.message : tc('unexpectedError'))
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none'

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-bold text-gray-900">{t('title')}</h2>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{guestName}</span> · {trattamento}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2].map(s => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${step >= s ? 'bg-purple-500' : 'bg-gray-200'}`} />
            <p className="text-[10px] font-medium text-gray-400 mt-1">
              {s === 1 ? t('tellUs') : tc('confirm')}
            </p>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: PARLACI DI TE ──────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Nessuna condizione */}
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-green-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.dichiarazioneNessuna}
                onChange={e => setNessuna(e.target.checked)}
                className="w-5 h-5 rounded accent-green-500"
              />
              <div>
                {/* TODO: i18n */}
                <span className="font-medium text-gray-900">Non ho condizioni mediche rilevanti</span>
                <p className="text-xs text-gray-400">Seleziona se non hai patologie, allergie o gravidanza in corso</p>
              </div>
            </label>

            {!form.dichiarazioneNessuna && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6"
              >
                {/* Condizioni di salute */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    {/* TODO: i18n */}
                    <Shield className="w-4 h-4 text-purple-500" /> Condizioni di salute
                  </h3>
                  {/* TODO: i18n */}
                  <p className="text-xs text-gray-400 mb-3">Seleziona tutto ciò che si applica</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CONDIZIONI_SALUTE.map(c => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                          form.condizioni.includes(c.id)
                            ? 'border-purple-400 bg-purple-50 text-purple-900'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.condizioni.includes(c.id)}
                          onChange={() => toggleCondizione(c.id)}
                          className="w-4 h-4 rounded accent-purple-500"
                        />
                        <span>{c.icon}</span>
                        <span>{c.label}</span>
                      </label>
                    ))}
                  </div>
                  {form.condizioni.includes('altro') && (
                    <input
                      type="text"
                      value={form.condizioneAltro}
                      onChange={e => setForm(f => ({ ...f, condizioneAltro: e.target.value }))}
                      placeholder="Specifica la condizione..."
                      className={`${inp} mt-2`}
                    />
                  )}
                </div>

                {/* Gravidanza */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.incinta}
                      onChange={e => setForm(f => ({ ...f, incinta: e.target.checked, incintaMesi: e.target.checked ? f.incintaMesi : undefined }))}
                      className="w-5 h-5 rounded accent-amber-500"
                    />
                    {/* TODO: i18n */}
                    <span className="font-medium text-gray-900">Sono in attesa di un bambino</span>
                  </label>
                  {form.incinta && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-3">
                      {/* TODO: i18n */}
                      <label className="text-sm text-gray-700">Mese:</label>
                      <select
                        value={form.incintaMesi || ''}
                        onChange={e => setForm(f => ({ ...f, incintaMesi: e.target.value ? parseInt(e.target.value) : undefined }))}
                        className={`${inp} w-24`}
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(m => (
                          <option key={m} value={m}>{m}°</option>
                        ))}
                      </select>
                      {/* TODO: i18n */}
                      <p className="text-xs text-amber-700">Alcuni trattamenti potrebbero essere adattati.</p>
                    </motion.div>
                  )}
                </div>

                {/* Allergie */}
                <div>
                  {/* TODO: i18n */}
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Allergie note</h3>
                  <div className="flex flex-wrap gap-2">
                    {ALLERGIE_COMUNI.map(a => (
                      <label
                        key={a.id}
                        className={`px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          form.allergieSelezionate.includes(a.id)
                            ? 'border-red-400 bg-red-50 text-red-800'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.allergieSelezionate.includes(a.id)}
                          onChange={() => toggleAllergia(a.id)}
                          className="sr-only"
                        />
                        {a.label}
                      </label>
                    ))}
                    <input
                      type="text"
                      value={form.allergieAltro}
                      onChange={e => setForm(f => ({ ...f, allergieAltro: e.target.value }))}
                      placeholder="Altre allergie..."
                      className={`${inp} flex-1 min-w-[150px]`}
                    />
                  </div>
                </div>

                {/* Farmaci */}
                <div>
                  {/* TODO: i18n */}
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Farmaci in corso</h3>
                  <input
                    type="text"
                    value={form.farmaci}
                    onChange={e => setForm(f => ({ ...f, farmaci: e.target.value }))}
                    placeholder="Es. anticoagulanti, cortisone... (opzionale)"
                    className={inp}
                  />
                </div>
              </motion.div>
            )}

            {/* Zone da evitare */}
            <div>
              <button
                type="button"
                onClick={() => setExpandZone(!expandZone)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-800 w-full"
              >
                {/* TODO: i18n */}
                Zone del corpo da evitare
                <span className="text-xs text-gray-400 font-normal">(opzionale)</span>
                {expandZone ? <ChevronUp className="w-4 h-4 ml-auto text-gray-400" /> : <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />}
              </button>
              {expandZone && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 mt-3">
                  {ZONE_EVITARE.map(z => (
                    <label
                      key={z.id}
                      className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-xs ${
                        form.zoneEvitare.includes(z.id)
                          ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.zoneEvitare.includes(z.id)}
                        onChange={() => toggleZonaEvitare(z.id)}
                        className="sr-only"
                      />
                      {z.label}
                    </label>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Preferenze trattamento */}
            <div className="space-y-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                {/* TODO: i18n */}
                <Sparkles className="w-4 h-4 text-amber-500" /> Le tue preferenze
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {/* TODO: i18n */}
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Pressione massaggio</label>
                  <div className="flex gap-1.5">
                    {[{ v: 'leggera', l: 'Leggera' }, { v: 'media', l: 'Media' }, { v: 'forte', l: 'Forte' }].map(o => (
                      <label key={o.v} className={`flex-1 text-center py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                        form.pressioneMassaggio === o.v ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                        <input type="radio" name="pressione" value={o.v} checked={form.pressioneMassaggio === o.v}
                          onChange={() => setForm(f => ({ ...f, pressioneMassaggio: o.v }))} className="sr-only" />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  {/* TODO: i18n */}
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Temperatura</label>
                  <div className="flex gap-1.5">
                    {[{ v: 'freddo', l: '❄ Freddo' }, { v: 'tiepido', l: '☀ Tiepido' }, { v: 'caldo', l: '🔥 Caldo' }].map(o => (
                      <label key={o.v} className={`flex-1 text-center py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                        form.temperaturaPreferita === o.v ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                        <input type="radio" name="temp" value={o.v} checked={form.temperaturaPreferita === o.v}
                          onChange={() => setForm(f => ({ ...f, temperaturaPreferita: o.v }))} className="sr-only" />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  {/* TODO: i18n */}
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Musica di sottofondo</label>
                  <div className="flex gap-1.5">
                    {[{ v: 'si', l: 'Si' }, { v: 'no', l: 'No' }, { v: 'indifferente', l: 'Indiff.' }].map(o => (
                      <label key={o.v} className={`flex-1 text-center py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                        form.musicaPreferita === o.v ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                        <input type="radio" name="musica" value={o.v} checked={form.musicaPreferita === o.v}
                          onChange={() => setForm(f => ({ ...f, musicaPreferita: o.v }))} className="sr-only" />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  {/* TODO: i18n */}
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Aromi / oli essenziali</label>
                  <div className="flex gap-1.5">
                    {[{ v: 'si', l: 'Si, grazie' }, { v: 'senza', l: 'Preferisco senza' }].map(o => (
                      <label key={o.v} className={`flex-1 text-center py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                        form.aromiPreferiti === o.v ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                        <input type="radio" name="aromi" value={o.v} checked={form.aromiPreferiti === o.v}
                          onChange={() => setForm(f => ({ ...f, aromiPreferiti: o.v }))} className="sr-only" />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                {/* TODO: i18n */}
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Altre richieste o preferenze</label>
                <input
                  type="text"
                  value={form.notePreferenze}
                  onChange={e => setForm(f => ({ ...f, notePreferenze: e.target.value }))}
                  placeholder="Es. mi rilasso meglio in silenzio, preferisco olio di cocco..."
                  className={inp}
                />
              </div>
            </div>

            {/* Avanti */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors"
            >
              {/* TODO: i18n */}
              Continua
            </button>
          </motion.div>
        )}

        {/* ── STEP 2: CONFERMA E ACCETTA ─────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Riepilogo dichiarazioni */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-sm">
              {/* TODO: i18n */}
              <h4 className="font-semibold text-gray-800">Riepilogo</h4>
              {form.dichiarazioneNessuna && (
                <p className="text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Nessuna condizione medica dichiarata
                </p>
              )}
              {form.incinta && (
                <p className="text-amber-700">In attesa — {form.incintaMesi ? `${form.incintaMesi}° mese` : 'mese non specificato'}</p>
              )}
              {form.condizioni.length > 0 && (
                <p className="text-gray-700">Condizioni: {form.condizioni.map(c => CONDIZIONI_SALUTE.find(cs => cs.id === c)?.label || c).join(', ')}</p>
              )}
              {form.condizioneAltro && <p className="text-gray-700">Altro: {form.condizioneAltro}</p>}
              {(haAllergie) && (
                <p className="text-red-700">Allergie: {[...form.allergieSelezionate.map(a => ALLERGIE_COMUNI.find(ac => ac.id === a)?.label || a), form.allergieAltro].filter(Boolean).join(', ')}</p>
              )}
              {form.farmaci && <p className="text-gray-700">Farmaci: {form.farmaci}</p>}
              {form.zoneEvitare.length > 0 && (
                <p className="text-gray-700">Zone da evitare: {form.zoneEvitare.map(z => ZONE_EVITARE.find(ze => ze.id === z)?.label || z).join(', ')}</p>
              )}
              {form.pressioneMassaggio && <p className="text-gray-500">Pressione: {form.pressioneMassaggio}</p>}
              {form.temperaturaPreferita && <p className="text-gray-500">Temperatura: {form.temperaturaPreferita}</p>}
              {!form.dichiarazioneNessuna && !haCondizioni && !haAllergie && !form.farmaci && (
                <p className="text-gray-400 italic">Nessuna informazione medica inserita</p>
              )}
            </div>

            {/* Firma — solo se condizioni mediche */}
            {richiedeFirma && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  {/* TODO: i18n */}
                  <h3 className="text-sm font-semibold text-gray-800">Firma obbligatoria</h3>
                </div>
                {/* TODO: i18n */}
                <p className="text-xs text-gray-500">Hai dichiarato condizioni mediche. La firma conferma la veridicità delle informazioni fornite.</p>
                <SignaturePad
                  onSave={base64 => setFirma(base64)}
                  onClear={() => setFirma(null)}
                />
                {firma && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    {/* TODO: i18n */}
                    <CheckCircle className="w-3.5 h-3.5" /> Firma acquisita
                  </p>
                )}
              </div>
            )}

            {/* Accettazioni */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.accettazioneTermini}
                  onChange={e => setForm(f => ({ ...f, accettazioneTermini: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded accent-purple-500"
                />
                <span className="text-sm text-gray-700">
                  {/* TODO: i18n */}
                  Dichiaro di aver letto e accettato i <strong>Termini e Condizioni</strong> del servizio SPA *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.accettazionePrivacy}
                  onChange={e => setForm(f => ({ ...f, accettazionePrivacy: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded accent-purple-500"
                />
                <span className="text-sm text-gray-700">
                  {/* TODO: i18n */}
                  Accetto il trattamento dei dati personali secondo la <strong>Privacy Policy</strong> *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consensoFoto}
                  onChange={e => setForm(f => ({ ...f, consensoFoto: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded accent-purple-500"
                />
                <span className="text-sm text-gray-600">
                  {/* TODO: i18n */}
                  Autorizzo foto/video per documentazione interna (opzionale)
                </span>
              </label>
            </div>

            {/* Bottoni */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                {tc('back')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !form.accettazioneTermini || !form.accettazionePrivacy || (richiedeFirma && !firma)}
                className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                {/* TODO: i18n */}
                {loading ? tc('saving') : 'Conferma e accetta'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
