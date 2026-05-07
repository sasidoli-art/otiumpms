'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Building2, MapPin, Sparkles, ChevronRight, ChevronLeft, Check,
  Loader2, Waves, Wrench, Shield, Bot, Mail, FileText,
  CalendarDays, Search, Boxes, UtensilsCrossed, ShoppingBag,
  TrendingUp, AlertTriangle, ClipboardCheck, MessageSquare,
  CalendarRange, Globe, BookOpen, Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATALOGO_MODULI } from '@/lib/moduli'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICONS: Record<string, any> = {
  BookOpen, Building2, Sparkles, Wrench, ClipboardCheck, MessageSquare,
  Shield, Search, Boxes, AlertTriangle, Waves, CalendarDays, FileText,
  TrendingUp, UtensilsCrossed, ShoppingBag, Bot, Mail, CalendarRange, Globe, Award,
}

const STRUCTURE_TYPES = [
  { value: 'ALLOGGIO', icon: '🏨', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'EVENTO', icon: '🎭', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'VENUE', icon: '🏛️', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'ESPERIENZA', icon: '🌟', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'SERVIZIO', icon: '💼', color: 'bg-slate-100 text-slate-700 border-slate-300' },
] as const

interface Props {
  userName: string
  currentCompanyName: string
}

export function OnboardingWizard({ userName, currentCompanyName }: Props) {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [company, setCompany] = useState({
    nomeAzienda: currentCompanyName || '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    regione: '',
    telefono: '',
    partitaIva: '',
  })

  const [structure, setStructure] = useState({
    nome: '',
    tipo: 'ALLOGGIO' as string,
    capacita: 10,
    prezzo: 0,
    citta: '',
    descrizione: '',
  })

  const [modules, setModules] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {}
    CATALOGO_MODULI.forEach(m => { defaults[m.id] = m.defaultAttivo })
    return defaults
  })

  const STEPS = [
    { key: 'welcome', label: t('steps.welcome') },
    { key: 'company', label: t('steps.company') },
    { key: 'structure', label: t('steps.structure') },
    { key: 'modules', label: t('steps.modules') },
  ]

  function canNext(): boolean {
    if (step === 1) return company.nomeAzienda.trim().length > 0
    if (step === 2) return structure.nome.trim().length > 0
    return true
  }

  async function handleFinish() {
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/host/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...company,
          strutturaNome: structure.nome,
          strutturaTipo: structure.tipo,
          strutturaCapacita: structure.capacita,
          strutturaPrezzo: structure.prezzo,
          strutturaCitta: structure.citta || company.citta,
          strutturaDescrizione: structure.descrizione,
          moduliAttivi: modules,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || tc('unexpectedError'))
        setSaving(false)
        return
      }

      router.push('/host/dashboard')
      router.refresh()
    } catch (err) { console.error(err) 
      setError(tc('networkError'))
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex-1 flex items-center gap-1">
            <div className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-500',
              i <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
            )} />
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between mb-10">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
            className={cn(
              'text-xs font-medium transition-colors',
              i === step ? 'text-blue-600 dark:text-blue-400' : i < step ? 'text-slate-500 cursor-pointer hover:text-slate-700' : 'text-slate-300 dark:text-slate-600'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* ═══ Step 0: Welcome ═══ */}
        {step === 0 && (
          <div className="p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚀</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              {t('welcome.title', { name: userName.split(' ')[0] || '' })}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
              {t('welcome.subtitle')}
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
              {[
                { icon: '📋', label: t('welcome.feature1') },
                { icon: '🏨', label: t('welcome.feature2') },
                { icon: '⚙️', label: t('welcome.feature3') },
              ].map(f => (
                <div key={f.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium text-center leading-tight">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Step 1: Company ═══ */}
        {step === 1 && (
          <div className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('company.title')}</h2>
                <p className="text-sm text-slate-500">{t('company.subtitle')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('company.companyName')} *
                </label>
                <input
                  type="text"
                  value={company.nomeAzienda}
                  onChange={e => setCompany(p => ({ ...p, nomeAzienda: e.target.value }))}
                  placeholder={t('company.companyPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{tc('city')}</label>
                  <input
                    type="text"
                    value={company.citta}
                    onChange={e => setCompany(p => ({ ...p, citta: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{tc('province')}</label>
                  <input
                    type="text"
                    value={company.provincia}
                    onChange={e => setCompany(p => ({ ...p, provincia: e.target.value }))}
                    maxLength={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{tc('address')}</label>
                <input
                  type="text"
                  value={company.indirizzo}
                  onChange={e => setCompany(p => ({ ...p, indirizzo: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{tc('phone')}</label>
                  <input
                    type="tel"
                    value={company.telefono}
                    onChange={e => setCompany(p => ({ ...p, telefono: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('company.vatNumber')}</label>
                  <input
                    type="text"
                    value={company.partitaIva}
                    onChange={e => setCompany(p => ({ ...p, partitaIva: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Step 2: First Structure ═══ */}
        {step === 2 && (
          <div className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('structure.title')}</h2>
                <p className="text-sm text-slate-500">{t('structure.subtitle')}</p>
              </div>
            </div>

            {/* Structure type selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('structure.typeLabel')}</label>
              <div className="grid grid-cols-5 gap-2">
                {STRUCTURE_TYPES.map(st => (
                  <button
                    key={st.value}
                    onClick={() => setStructure(p => ({ ...p, tipo: st.value }))}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                      structure.tipo === st.value
                        ? st.color + ' border-current shadow-sm'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 bg-white dark:bg-slate-800'
                    )}
                  >
                    <span className="text-xl">{st.icon}</span>
                    <span className="text-[10px] font-semibold">{t(`structure.types.${st.value}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('structure.name')} *
                </label>
                <input
                  type="text"
                  value={structure.nome}
                  onChange={e => setStructure(p => ({ ...p, nome: e.target.value }))}
                  placeholder={t('structure.namePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('structure.capacity')}</label>
                  <input
                    type="number"
                    min={1}
                    value={structure.capacita}
                    onChange={e => setStructure(p => ({ ...p, capacita: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('structure.basePrice')}</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={structure.prezzo}
                    onChange={e => setStructure(p => ({ ...p, prezzo: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{tc('description')}</label>
                <textarea
                  rows={3}
                  value={structure.descrizione}
                  onChange={e => setStructure(p => ({ ...p, descrizione: e.target.value }))}
                  placeholder={t('structure.descPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ Step 3: Modules ═══ */}
        {step === 3 && (
          <div className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('modules.title')}</h2>
                <p className="text-sm text-slate-500">{t('modules.subtitle')}</p>
              </div>
            </div>

            <div className="space-y-6">
              {['base', 'operativo', 'avanzato', 'integrazioni'].map(cat => {
                const items = CATALOGO_MODULI.filter(m => m.categoria === cat)
                if (items.length === 0) return null
                return (
                  <div key={cat}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {t(`modules.categories.${cat}`)}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map(m => {
                        const Icon = ICONS[m.icona] ?? Sparkles
                        const isOn = modules[m.id] ?? false
                        return (
                          <button
                            key={m.id}
                            onClick={() => setModules(p => ({ ...p, [m.id]: !p[m.id] }))}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                              isOn
                                ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                              isOn ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-slate-100 dark:bg-slate-700'
                            )}>
                              <Icon size={16} className={isOn ? 'text-blue-600' : 'text-slate-400'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-medium', isOn ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300')}>
                                {m.nome}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">{m.descrizione}</p>
                            </div>
                            <div className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                              isOn ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'
                            )}>
                              {isOn && <Check size={12} className="text-white" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ Error ═══ */}
        {error && (
          <div className="mx-8 mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* ═══ Footer ═══ */}
        <div className="flex items-center justify-between px-8 md:px-12 py-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              step === 0 ? 'invisible' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700'
            )}
          >
            <ChevronLeft size={16} />
            {tc('back')}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all',
                canNext()
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              {step === 0 ? t('welcome.start') : tc('next')}
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {tc('saving')}
                </>
              ) : (
                <>
                  <Check size={16} />
                  {t('finish')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <p className="text-center text-xs text-slate-400 mt-6">
        {t('stepOf', { current: step + 1, total: STEPS.length })}
      </p>
    </div>
  )
}
