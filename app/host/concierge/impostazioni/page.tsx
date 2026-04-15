'use client'

import { useState, useEffect } from 'react'
import { Settings, Loader2, Check, Bot, Globe, Key, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

type Preset = {
  id: string
  label: string
  desc: string
  provider: 'openai' | 'claude' | 'ollama'
  model: string
  baseUrl: string
  keyPlaceholder: string
}

const PRESETS: Preset[] = [
  {
    id: 'claude-haiku',
    label: '⭐ Claude Haiku 4.5 (consigliato)',
    desc: 'Cloud · italiano eccellente · tool use affidabile · GDPR-friendly',
    provider: 'claude',
    model: 'claude-haiku-4-5-20251001',
    baseUrl: '',
    keyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'openrouter-qwen',
    label: 'Qwen 2.5 72B (OpenRouter)',
    desc: 'Cloud · economico · italiano buono · routing forzato EU/DPF',
    provider: 'openai',
    model: 'qwen/qwen-2.5-72b-instruct',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'openrouter-qwen-7b',
    label: 'Qwen 2.5 7B (OpenRouter)',
    desc: 'Cloud · molto economico · per test e prototipi',
    provider: 'openai',
    model: 'qwen/qwen-2.5-7b-instruct',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'openai-gpt4o-mini',
    label: 'GPT-4o mini',
    desc: 'Cloud · OpenAI diretto · italiano ottimo',
    provider: 'openai',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'ollama-local',
    label: 'Qwen 2.5 7B (Ollama locale)',
    desc: 'Self-hosted · gratis · privacy totale · richiede server',
    provider: 'ollama',
    model: 'qwen2.5:7b',
    baseUrl: 'http://localhost:11434',
    keyPlaceholder: '',
  },
]

export default function ConciergeSettingsPage() {
  const t = useTranslations('host.concierge')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successo, setSuccesso] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    conciergeAttivo: false,
    conciergeProvider: 'ollama',
    conciergeApiKey: '',
    conciergeModel: 'llama3.1',
    conciergeBaseUrl: '',
    conciergeSystemPrompt: '',
    whatsappNumeroId: '',
    whatsappAccessToken: '',
    whatsappVerifyToken: '',
  })

  useEffect(() => {
    fetch('/api/host/profilo')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setForm({
          conciergeAttivo: d.conciergeAttivo ?? false,
          conciergeProvider: d.conciergeProvider || 'ollama',
          conciergeApiKey: d.conciergeApiKey || '',
          conciergeModel: d.conciergeModel || 'llama3.1',
          conciergeBaseUrl: d.conciergeBaseUrl || '',
          conciergeSystemPrompt: d.conciergeSystemPrompt || '',
          whatsappNumeroId: d.whatsappNumeroId || '',
          whatsappAccessToken: d.whatsappAccessToken || '',
          whatsappVerifyToken: d.whatsappVerifyToken || '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  function applyPreset(p: Preset) {
    setForm(f => ({
      ...f,
      conciergeProvider: p.provider,
      conciergeModel: p.model,
      conciergeBaseUrl: p.baseUrl,
    }))
    setTestResult(null)
  }

  async function testConnection() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/host/concierge/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: form.conciergeProvider,
          apiKey: form.conciergeApiKey,
          model: form.conciergeModel,
          baseUrl: form.conciergeBaseUrl,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setTestResult({ ok: true, msg: `OK · ${data.response?.slice(0, 80) ?? ''}` })
      } else {
        setTestResult({ ok: false, msg: data.error || 'Errore sconosciuto' })
      }
    } catch (err) {
      setTestResult({ ok: false, msg: 'Errore di rete' })
    } finally {
      setTesting(false)
    }
  }

  async function salva() {
    setSaving(true); setSuccesso(false)
    await fetch('/api/host/profilo', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSuccesso(true); setSaving(false)
    setTimeout(() => setSuccesso(false), 2000)
    router.refresh()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2"><Settings className="w-6 h-6 text-purple-500" /> {t('settingsTitle')}</h1>
          <p className="text-sm text-gray-500">{t('settingsSubtitle')}</p>
        </div>
      </div>

      {/* Attivo/disattivo */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-purple-500" />
          <div>
            <p className="text-sm font-semibold">{t('aiConcierge')}</p>
            <p className="text-xs text-gray-400">{form.conciergeAttivo ? t('activeDesc') : t('disabledDesc')}</p>
          </div>
        </div>
        <button onClick={() => setForm(f => ({ ...f, conciergeAttivo: !f.conciergeAttivo }))}
          className={`w-12 h-7 rounded-full relative transition-colors ${form.conciergeAttivo ? 'bg-purple-500' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.conciergeAttivo ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Provider AI */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Key className="w-4 h-4 text-gray-500" /> Modello AI</h3>
        <p className="text-xs text-gray-400">Scegli un preset pronto, oppure imposta manualmente provider + model + base URL.</p>

        {/* Preset chooser */}
        <div className="grid gap-2">
          {PRESETS.map(p => {
            const isActive =
              form.conciergeProvider === p.provider &&
              form.conciergeModel === p.model &&
              (form.conciergeBaseUrl || '') === p.baseUrl
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`p-3 rounded-lg border-2 text-left text-xs transition-all ${
                  isActive
                    ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-slate-600 hover:border-purple-300'
                }`}
              >
                <p className="font-semibold">{p.label}</p>
                <p className="text-gray-400 mt-0.5">{p.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Configurazione manuale (sempre visibile) */}
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">Configurazione manuale</p>

          <div className="grid grid-cols-3 gap-2">
            {(['ollama', 'claude', 'openai'] as const).map(prov => (
              <button
                key={prov}
                type="button"
                onClick={() => setForm(f => ({ ...f, conciergeProvider: prov }))}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  form.conciergeProvider === prov
                    ? 'border-purple-400 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-slate-600 text-gray-500'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Modello</label>
            <input
              type="text"
              value={form.conciergeModel}
              onChange={e => setForm(f => ({ ...f, conciergeModel: e.target.value }))}
              className={inp}
              placeholder="qwen/qwen-2.5-72b-instruct · claude-haiku-4-5-20251001 · qwen2.5:7b"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">
              Base URL (vuoto = default del provider)
            </label>
            <input
              type="text"
              value={form.conciergeBaseUrl}
              onChange={e => setForm(f => ({ ...f, conciergeBaseUrl: e.target.value }))}
              className={inp}
              placeholder="https://openrouter.ai/api/v1"
            />
          </div>

          {form.conciergeProvider !== 'ollama' && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">API key</label>
              <input
                type="password"
                value={form.conciergeApiKey}
                onChange={e => setForm(f => ({ ...f, conciergeApiKey: e.target.value }))}
                placeholder={
                  form.conciergeProvider === 'claude'
                    ? 'sk-ant-...'
                    : form.conciergeBaseUrl?.includes('openrouter')
                    ? 'sk-or-v1-...'
                    : 'sk-...'
                }
                className={inp}
              />
            </div>
          )}

          {/* Test connection */}
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {testing ? 'Test in corso...' : 'Test connessione'}
          </button>

          {testResult && (
            <div
              className={`text-xs p-2 rounded-lg ${
                testResult.ok
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {testResult.ok ? '✅' : '❌'} {testResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* System prompt */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold">{t('systemPrompt')}</h3>
        <p className="text-xs text-gray-400">{t('systemPromptPlaceholder')}</p>
        <textarea value={form.conciergeSystemPrompt} onChange={e => setForm(f => ({ ...f, conciergeSystemPrompt: e.target.value }))} rows={8} className={inp}
          placeholder="Colazione 7:30-10:00 al ristorante La Terrazza.&#10;Checkout ore 11:00. Late checkout possibile fino alle 14:00 su richiesta.&#10;Wi-Fi: OtiumGuest / password1234&#10;Parcheggio gratuito nel cortile interno.&#10;SPA aperta 9:00-20:00, prenotazione obbligatoria." />
      </div>

      {/* WhatsApp */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-green-500" /> {t('whatsapp')}</h3>
        <p className="text-xs text-gray-400">{t('whatsappDesc')}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">{t('phoneNumberId')}</label>
            <input type="text" value={form.whatsappNumeroId} onChange={e => setForm(f => ({ ...f, whatsappNumeroId: e.target.value }))} className={inp} placeholder="1234567890" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">{t('verifyToken')}</label>
            <input type="text" value={form.whatsappVerifyToken} onChange={e => setForm(f => ({ ...f, whatsappVerifyToken: e.target.value }))} className={inp} placeholder="myverifytoken123" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">{t('accessToken')}</label>
          <input type="password" value={form.whatsappAccessToken} onChange={e => setForm(f => ({ ...f, whatsappAccessToken: e.target.value }))} className={inp} placeholder="EAAx..." />
        </div>
      </div>

      {/* Salva */}
      <button onClick={salva} disabled={saving}
        className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${successo ? 'bg-green-500 text-white' : 'btn-primary'}`}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : successo ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
        {saving ? tc('saving') : successo ? tc('saved') : t('saveSettings')}
      </button>
    </div>
  )
}
