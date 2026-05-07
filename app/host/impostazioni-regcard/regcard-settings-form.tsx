'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  FileText, Shield, Waves, Plus, Trash2, Save, Loader2,
  CheckCircle, GripVertical, RotateCcw, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { DEFAULT_REGCARD_IT, DEFAULT_REGCARD_EN, CLAUSOLE_OBBLIGATORIE_IT } from '@/lib/regcard-defaults'

export type CampoExtra = {
  label: string
  tipo: 'testo' | 'checkbox' | 'select'
  obbligatorio: boolean
  opzioni?: string // per select, separate da virgola
}

interface Props {
  terminiHtml: string
  privacyHtml: string
  spaTerminiHtml: string
  campiExtra: CampoExtra[]
}

export function RegCardSettingsForm({ terminiHtml, privacyHtml, spaTerminiHtml, campiExtra: initialCampi }: Props) {
  const tc = useTranslations('common')
  const router = useRouter()

  const [tab, setTab] = useState<'hotel' | 'spa' | 'campi'>('hotel')
  const [termini, setTermini] = useState(terminiHtml)
  const [privacy, setPrivacy] = useState(privacyHtml)
  const [spaTermini, setSpaTermini] = useState(spaTerminiHtml)
  const [campiExtra, setCampiExtra] = useState<CampoExtra[]>(initialCampi)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function addCampo() {
    setCampiExtra(p => [...p, { label: '', tipo: 'testo', obbligatorio: false }])
  }

  function removeCampo(i: number) {
    setCampiExtra(p => p.filter((_, idx) => idx !== i))
  }

  function updateCampo(i: number, field: string, value: string | boolean) {
    setCampiExtra(p => p.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    const res = await fetch('/api/host/regcard-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regCardTerminiHtml: termini || null,
        regCardPrivacyHtml: privacy || null,
        regCardSpaTerminiHtml: spaTermini || null,
        regCardCampiExtra: campiExtra.filter(c => c.label.trim()),
      }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    }
  }

  const TABS = [
    { key: 'hotel' as const, label: 'T&C Hotel', icon: <FileText size={14} /> },
    { key: 'spa' as const, label: 'T&C SPA', icon: <Waves size={14} /> },
    { key: 'campi' as const, label: 'Campi personalizzati', icon: <Plus size={14} /> },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
          <FileText className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Registration Card</h1>
          <p className="text-sm text-slate-500">Personalizza termini, condizioni e campi delle schede di registrazione</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
              tab === t.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Hotel T&C */}
      {tab === 'hotel' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <FileText size={14} className="text-indigo-500" />
              Termini e Condizioni del Soggiorno
            </label>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">
                Usa i placeholder: {'{{NOME_HOTEL}}'}, {'{{CITTA_FORO}}'}, {'{{PENALE_FUMO}}'}, {'{{COSTO_CHIAVE}}'} — verranno sostituiti automaticamente.
              </p>
              <button
                type="button"
                onClick={() => { if (!termini || confirm('Sovrascrivere il testo attuale con lo standard legale?')) setTermini(DEFAULT_REGCARD_IT) }}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors shrink-0"
              >
                <RotateCcw size={12} /> Carica standard
              </button>
            </div>
            {termini && !CLAUSOLE_OBBLIGATORIE_IT.every(c => termini.includes(c)) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-2">
                <AlertTriangle size={14} className="shrink-0" />
                Attenzione: il testo personalizzato non contiene alcune clausole GDPR obbligatorie. Clicca "Carica standard" per ripristinarle.
              </div>
            )}
            <textarea
              value={termini}
              onChange={e => setTermini(e.target.value)}
              rows={16}
              placeholder="Clicca 'Carica standard' per iniziare dal testo legale professionale..."
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 resize-y font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Shield size={14} className="text-green-500" />
              Informativa Privacy (GDPR)
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Personalizza l'informativa privacy. Se vuota, verrà usato il testo predefinito conforme al GDPR.
            </p>
            <textarea
              value={privacy}
              onChange={e => setPrivacy(e.target.value)}
              rows={10}
              placeholder="INFORMATIVA SUL TRATTAMENTO DEI DATI PERSONALI&#10;(ai sensi degli artt. 13-14 del Regolamento UE 2016/679)..."
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 resize-y font-mono"
            />
          </div>
        </div>
      )}

      {/* SPA T&C */}
      {tab === 'spa' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Waves size={14} className="text-teal-500" />
            Termini e Condizioni del Centro Benessere
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Personalizza i termini SPA. Se vuoto, verrà usato il testo predefinito con controindicazioni e policy cancellazione.
          </p>
          <textarea
            value={spaTermini}
            onChange={e => setSpaTermini(e.target.value)}
            rows={14}
            placeholder="CONDIZIONI GENERALI DEL CENTRO BENESSERE&#10;&#10;1. PRENOTAZIONE E CANCELLAZIONE&#10;..."
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 resize-y font-mono"
          />
        </div>
      )}

      {/* Custom fields */}
      {tab === 'campi' && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            Aggiungi campi personalizzati alla Registration Card. Questi campi verranno mostrati all'ospite durante il check-in online, dopo i dati personali e prima della firma.
          </p>

          <div className="space-y-3 mb-4">
            {campiExtra.map((campo, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <GripVertical size={14} className="text-slate-300 mt-2.5 shrink-0" />
                <div className="flex-1 grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={campo.label}
                      onChange={e => updateCampo(i, 'label', e.target.value)}
                      placeholder="Nome campo (es. Targa auto, Allergie alimentari)"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={campo.tipo}
                      onChange={e => updateCampo(i, 'tipo', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
                    >
                      <option value="testo">Testo</option>
                      <option value="checkbox">Checkbox (Sì/No)</option>
                      <option value="select">Selezione</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    {campo.tipo === 'select' && (
                      <input
                        type="text"
                        value={campo.opzioni ?? ''}
                        onChange={e => updateCampo(i, 'opzioni', e.target.value)}
                        placeholder="Opzione 1, Opzione 2"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
                      />
                    )}
                    {campo.tipo !== 'select' && (
                      <label className="flex items-center gap-2 h-full cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campo.obbligatorio}
                          onChange={e => updateCampo(i, 'obbligatorio', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                        />
                        <span className="text-xs text-slate-500">Obbligatorio</span>
                      </label>
                    )}
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button onClick={() => removeCampo(i)} className="text-slate-400 hover:text-red-500 p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addCampo}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors w-full justify-center"
          >
            <Plus size={14} /> Aggiungi campo personalizzato
          </button>

          {campiExtra.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-600 dark:text-blue-400">
              <p className="font-semibold mb-1">Anteprima campi:</p>
              {campiExtra.filter(c => c.label.trim()).map((c, i) => (
                <p key={i}>• {c.label} ({c.tipo}{c.obbligatorio ? ', obbligatorio' : ''})</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? tc('saving') : tc('save')}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle size={14} /> {tc('savedSuccess')}
          </span>
        )}
      </div>
    </div>
  )
}
