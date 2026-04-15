'use client'

import { useState } from 'react'
import { Bot, Save, Zap, Loader2, Check, AlertCircle } from 'lucide-react'

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
    desc: 'Anthropic · italiano eccellente · tool use affidabile · DPF + EU region',
    provider: 'claude',
    model: 'claude-haiku-4-5-20251001',
    baseUrl: '',
    keyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'openrouter-qwen',
    label: 'Qwen 2.5 72B (OpenRouter)',
    desc: 'Cloud · economico · routing forzato Together/Fireworks (EU-friendly)',
    provider: 'openai',
    model: 'qwen/qwen-2.5-72b-instruct',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'openrouter-qwen-7b',
    label: 'Qwen 2.5 7B (OpenRouter)',
    desc: 'Cloud · molto economico · per test',
    provider: 'openai',
    model: 'qwen/qwen-2.5-7b-instruct',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'openai-gpt4o-mini',
    label: 'GPT-4o mini',
    desc: 'OpenAI diretto · italiano ottimo',
    provider: 'openai',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'ollama-local',
    label: 'Qwen 2.5 7B (Ollama locale)',
    desc: 'Self-hosted · gratis · privacy totale · richiede server Otium dedicato',
    provider: 'ollama',
    model: 'qwen2.5:7b',
    baseUrl: 'http://localhost:11434',
    keyPlaceholder: '',
  },
]

type Initial = {
  aiProvider: string | null
  aiModel: string | null
  aiBaseUrl: string | null
  aiApiKeySet: boolean
  updatedAt: string
}

export default function PlatformAiClient({ initial }: { initial: Initial }) {
  const [form, setForm] = useState({
    aiProvider: (initial.aiProvider || 'claude') as 'ollama' | 'claude' | 'openai',
    aiModel: initial.aiModel || 'claude-haiku-4-5-20251001',
    aiBaseUrl: initial.aiBaseUrl || '',
    aiApiKey: initial.aiApiKeySet ? '***' : '', // sentinel "unchanged" if already set
  })
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function applyPreset(p: Preset) {
    setForm(f => ({
      ...f,
      aiProvider: p.provider,
      aiModel: p.model,
      aiBaseUrl: p.baseUrl,
    }))
    setTestResult(null)
  }

  async function salva() {
    setSaving(true)
    setSavedOk(false)
    try {
      const res = await fetch('/api/superadmin/platform-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider: form.aiProvider,
          aiModel: form.aiModel,
          aiBaseUrl: form.aiBaseUrl || null,
          aiApiKey: form.aiApiKey === '' ? null : form.aiApiKey, // '***' = lascia invariato lato API
        }),
      })
      if (res.ok) {
        setSavedOk(true)
        setTimeout(() => setSavedOk(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      // Salva PRIMA di testare, poi usa l'endpoint di test con i valori correnti
      // (l'host test endpoint già esistente fa il lavoro)
      const res = await fetch('/api/host/concierge/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: form.aiProvider,
          apiKey: form.aiApiKey === '***' ? null : form.aiApiKey,
          model: form.aiModel,
          baseUrl: form.aiBaseUrl || null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setTestResult({ ok: true, msg: `OK · ${data.response?.slice(0, 80) ?? ''}` })
      } else {
        setTestResult({ ok: false, msg: data.error || 'Errore sconosciuto' })
      }
    } catch {
      setTestResult({ ok: false, msg: 'Errore di rete' })
    } finally {
      setTesting(false)
    }
  }

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <Bot className="w-6 h-6 text-purple-500" /> AI Provider (Platform Key)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurazione centralizzata dell&apos;AI concierge. Vale per <strong>tutti gli host</strong>{' '}
          della piattaforma. L&apos;host attiva/disattiva il concierge dal suo toggle, ma
          provider/chiave sono gestiti qui.
        </p>
      </div>

      {/* Box info strategia */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
        <p className="font-semibold mb-1">💡 Come funziona</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Tu scegli UN solo provider/modello qui. Tutti gli host del pilot lo usano.</li>
          <li>La chiave è tua (Otium SpA). Il costo token va in tasca tua, fatturato agli host come subscription.</li>
          <li>
            Se vuoi offrire opzione &quot;BYO key&quot; ad host grandi, puoi farlo dall&apos;interfaccia
            host (oggi disabilitata per semplicità).
          </li>
        </ul>
      </div>

      {/* Preset chooser */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold">Preset rapidi</h3>
        <p className="text-xs text-gray-400">
          Click per applicare configurazione pronta. Poi incolla la chiave API e Salva.
        </p>
        <div className="grid gap-2">
          {PRESETS.map(p => {
            const isActive =
              form.aiProvider === p.provider &&
              form.aiModel === p.model &&
              (form.aiBaseUrl || '') === p.baseUrl
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
      </div>

      {/* Configurazione manuale */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold">Configurazione</h3>

        <div className="grid grid-cols-3 gap-2">
          {(['claude', 'openai', 'ollama'] as const).map(prov => (
            <button
              key={prov}
              type="button"
              onClick={() => setForm(f => ({ ...f, aiProvider: prov }))}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                form.aiProvider === prov
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
            value={form.aiModel}
            onChange={e => setForm(f => ({ ...f, aiModel: e.target.value }))}
            className={inp}
            placeholder="claude-haiku-4-5-20251001 · qwen/qwen-2.5-72b-instruct · qwen2.5:7b"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">
            Base URL (vuoto = default del provider)
          </label>
          <input
            type="text"
            value={form.aiBaseUrl}
            onChange={e => setForm(f => ({ ...f, aiBaseUrl: e.target.value }))}
            className={inp}
            placeholder="https://openrouter.ai/api/v1 · http://ollama-server.local:11434"
          />
        </div>

        {form.aiProvider !== 'ollama' && (
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">
              API key {initial.aiApiKeySet && '(salvata — lascia *** per non modificare)'}
            </label>
            <input
              type="password"
              value={form.aiApiKey}
              onChange={e => setForm(f => ({ ...f, aiApiKey: e.target.value }))}
              placeholder={
                form.aiProvider === 'claude'
                  ? 'sk-ant-...'
                  : form.aiBaseUrl?.includes('openrouter')
                  ? 'sk-or-v1-...'
                  : 'sk-...'
              }
              className={inp}
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {testing ? 'Test...' : 'Test connessione'}
          </button>

          <button
            type="button"
            onClick={salva}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              savedOk ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : savedOk ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Salvataggio...' : savedOk ? 'Salvato' : 'Salva impostazioni'}
          </button>
        </div>

        {testResult && (
          <div
            className={`text-xs p-2 rounded-lg flex items-start gap-2 ${
              testResult.ok
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {testResult.ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{testResult.msg}</span>
          </div>
        )}
      </div>
    </div>
  )
}
