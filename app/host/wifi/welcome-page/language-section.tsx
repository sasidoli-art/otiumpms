'use client'

import { useState } from 'react'
import type { SplashConfig, Lang, TranslatableFields } from '@/lib/wifi/splash-config'
import { LANG_LABELS, TRANSLATABLE_FIELDS } from '@/lib/wifi/splash-config'

interface Props {
  config: SplashConfig
  onPatch: <K extends keyof SplashConfig>(k: K, v: SplashConfig[K]) => void
}

const ALL_LANGS: Lang[] = ['it', 'en', 'de', 'fr']

const FIELD_LABELS: Record<keyof TranslatableFields, string> = {
  titolo: 'Titolo',
  sottotitolo: 'Sottotitolo',
  messaggioWelcome: 'Messaggio welcome',
  testoBottone: 'Testo bottone',
  labelTabCodice: 'Tab «codice»',
  labelTabPrenotazione: 'Tab «prenotazione»',
  testoFooter: 'Footer',
  successTitolo: 'Titolo dopo login',
  successMessaggio: 'Messaggio dopo login',
}

export default function LanguageSection({ config, onPatch }: Props) {
  const enabledLangs = config.lingue ?? ['it']
  const defaultLang = config.linguaDefault ?? enabledLangs[0] ?? 'it'
  const [expandedLang, setExpandedLang] = useState<Lang | null>(null)

  function toggleLang(lang: Lang) {
    const isEnabled = enabledLangs.includes(lang)
    let next: Lang[]
    if (isEnabled) {
      next = enabledLangs.filter(l => l !== lang)
      if (next.length === 0) next = ['it']  // sempre almeno una
    } else {
      next = [...enabledLangs, lang]
    }
    // Riordina seguendo l'ordine canonico (it,en,de,fr)
    next = ALL_LANGS.filter(l => next.includes(l))
    onPatch('lingue', next)

    // Se la lingua disabilitata era default, sposta a prima rimasta
    if (isEnabled && lang === defaultLang) {
      onPatch('linguaDefault', next[0])
    }
  }

  function setDefault(lang: Lang) {
    onPatch('linguaDefault', lang)
  }

  function patchTranslation(lang: Lang, field: keyof TranslatableFields, value: string) {
    const cur = config.traduzioni ?? {}
    const langCur = cur[lang] ?? {}
    const nextLang = { ...langCur, [field]: value }
    if (!value) delete nextLang[field]
    const next = { ...cur, [lang]: nextLang }
    if (Object.keys(nextLang).length === 0) delete next[lang]
    onPatch('traduzioni', next)
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Multilingua</h2>
      <p className="text-xs text-gray-500 mb-4">
        Abilita le lingue: l&apos;ospite vedrà uno switcher con bandierine in alto a destra.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {ALL_LANGS.map(lang => {
          const enabled = enabledLangs.includes(lang)
          const isDefault = enabled && lang === defaultLang
          return (
            <button
              key={lang}
              type="button"
              onClick={() => toggleLang(lang)}
              className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                enabled
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="mr-1.5">{LANG_LABELS[lang].flag}</span>
              <span className="font-medium">{LANG_LABELS[lang].label}</span>
              {isDefault && <span className="ml-1.5 text-xs">⭐</span>}
            </button>
          )
        })}
      </div>

      {enabledLangs.length > 1 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">Lingua mostrata di default:</p>
          <div className="flex gap-2">
            {enabledLangs.map(lang => (
              <label key={lang} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={defaultLang === lang}
                  onChange={() => setDefault(lang)}
                />
                <span>{LANG_LABELS[lang].flag} {LANG_LABELS[lang].label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Pannelli traduzioni per ogni lingua non-italiana */}
      {enabledLangs.filter(l => l !== 'it').map(lang => {
        const isExpanded = expandedLang === lang
        const translations = config.traduzioni?.[lang] ?? {}
        const filledCount = TRANSLATABLE_FIELDS.filter(f => translations[f]).length
        return (
          <div key={lang} className="border rounded-lg mb-2 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedLang(isExpanded ? null : lang)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <span className="text-sm font-medium">
                {LANG_LABELS[lang].flag} Traduzioni {LANG_LABELS[lang].label}
              </span>
              <span className="text-xs text-gray-500">
                {filledCount}/{TRANSLATABLE_FIELDS.length} campi · {isExpanded ? '▲' : '▼'}
              </span>
            </button>
            {isExpanded && (
              <div className="px-4 py-3 bg-gray-50 border-t space-y-2">
                {TRANSLATABLE_FIELDS.map(field => (
                  <div key={field}>
                    <label className="block text-xs text-gray-600 mb-0.5">
                      {FIELD_LABELS[field]}
                      <span className="text-gray-400 ml-1">(IT: {(config[field] as string) || '—'})</span>
                    </label>
                    <input
                      type="text"
                      value={translations[field] ?? ''}
                      onChange={e => patchTranslation(lang, field, e.target.value)}
                      placeholder={`${FIELD_LABELS[field]} in ${LANG_LABELS[lang].label}`}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
