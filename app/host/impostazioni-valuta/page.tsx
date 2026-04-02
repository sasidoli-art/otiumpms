'use client'

import { useState, useEffect } from 'react'
import { Coins, Save, Loader2, Check, Info } from 'lucide-react'

// TODO: i18n

const VALUTE = [
  { code: 'EUR', label: 'Euro (EUR)', symbol: '\u20ac' },
  { code: 'USD', label: 'Dollaro USA (USD)', symbol: '$' },
  { code: 'GBP', label: 'Sterlina (GBP)', symbol: '\u00a3' },
  { code: 'CHF', label: 'Franco Svizzero (CHF)', symbol: 'CHF' },
]

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function ImpostazioniValutaPage() {
  const [valutaBase, setValutaBase] = useState('EUR')
  const [valuteAccettate, setValuteAccettate] = useState<string[]>(['EUR'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/host/profilo')
      .then(r => r.json())
      .then(data => {
        if (data.valutaBase) setValutaBase(data.valutaBase)
        if (data.valuteAccettate?.length) setValuteAccettate(data.valuteAccettate)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggleValuta(code: string) {
    setValuteAccettate(prev => {
      // La valuta base non puo' essere rimossa
      if (code === valutaBase) return prev
      if (prev.includes(code)) return prev.filter(v => v !== code)
      return [...prev, code]
    })
  }

  function handleBaseChange(code: string) {
    setValutaBase(code)
    // Assicura che la base sia sempre accettata
    setValuteAccettate(prev => prev.includes(code) ? prev : [...prev, code])
  }

  async function handleSave() {
    setSaving(true)
    setErrore(null)
    setSaved(false)

    const res = await fetch('/api/host/profilo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valutaBase, valuteAccettate }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore nel salvataggio')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Coins className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Multi-valuta</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configura le valute accettate dalla tua struttura</p>
        </div>
      </div>

      {/* Valuta base */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Valuta base</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          La valuta principale usata per fatturazione e report.
        </p>
        <select
          className={inp}
          value={valutaBase}
          onChange={e => handleBaseChange(e.target.value)}
        >
          {VALUTE.map(v => (
            <option key={v.code} value={v.code}>
              {v.symbol} {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Valute accettate */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Valute accettate</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Seleziona le valute che i tuoi ospiti possono usare per i pagamenti.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VALUTE.map(v => {
            const isBase = v.code === valutaBase
            const isChecked = valuteAccettate.includes(v.code)
            return (
              <label
                key={v.code}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isChecked
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'
                } ${isBase ? 'opacity-90' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isBase}
                  onChange={() => toggleValuta(v.code)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {v.symbol} {v.label}
                </span>
                {isBase && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                    Base
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          I tassi di cambio vengono aggiornati automaticamente. I prezzi nella valuta base restano invariati,
          mentre le conversioni sono indicative e vengono ricalcolate al momento del pagamento.
        </p>
      </div>

      {/* Errore */}
      {errore && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{errore}</p>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Salvato!' : 'Salva impostazioni'}
        </button>
      </div>
    </div>
  )
}
