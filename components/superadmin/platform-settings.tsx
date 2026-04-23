'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Save, Mail, Bot, Settings as SettingsIcon, Server,
  AlertTriangle, CheckCircle2, Send, Eye, EyeOff, Package,
} from 'lucide-react'

type Settings = {
  nomePiattaforma: string | null
  urlBase: string | null
  emailSupporto: string | null
  emailNoreply: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  smtpPassSet: boolean
  smtpFrom: string | null
  aiProvider: string | null
  aiModel: string | null
  aiApiKey: string | null
  aiApiKeySet: boolean
  aiBaseUrl: string | null
  pianiOverride: Record<string, { prezzoMensile?: number; prezzoAnnuale?: number; moduliInclusi?: string[] }> | null
  maintenanceMode: boolean
  maintenanceMessage: string | null
}

const PIANI = ['LIGHT', 'EVENTO_SINGOLO', 'VISIBILITA_MENSILE', 'PARTNER_PREMIUM']
const PIANO_LABEL: Record<string, string> = {
  LIGHT: 'Light',
  EVENTO_SINGOLO: 'Evento Singolo',
  VISIBILITA_MENSILE: 'Visibilità Mensile',
  PARTNER_PREMIUM: 'Partner Premium',
}

const DEFAULT_PREZZI: Record<string, { mese: number; anno: number }> = {
  LIGHT: { mese: 29, anno: 290 },
  EVENTO_SINGOLO: { mese: 49, anno: 49 },
  VISIBILITA_MENSILE: { mese: 149, anno: 1490 },
  PARTNER_PREMIUM: { mese: 349, anno: 3490 },
}

export default function PlatformSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState<Partial<Settings>>({})
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showSmtpPass, setShowSmtpPass] = useState(false)
  const [showAiKey, setShowAiKey] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/platform-settings')
    if (res.ok) {
      const s: Settings = await res.json()
      setSettings(s)
      setForm(s)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function setField<K extends keyof Settings>(k: K, v: Settings[K] | string | boolean | null) {
    setForm((f) => ({ ...f, [k]: v as Settings[K] }))
  }

  function setPianoOverride(piano: string, field: 'prezzoMensile' | 'prezzoAnnuale', value: number) {
    setForm((f) => ({
      ...f,
      pianiOverride: {
        ...(f.pianiOverride ?? {}),
        [piano]: {
          ...((f.pianiOverride ?? {})[piano] ?? {}),
          [field]: value,
        },
      },
    }))
  }

  async function save(section?: string) {
    setSaving(true); setError(''); setSaved(null)
    const body: Record<string, unknown> = { ...form }
    // Non mandare mask '***' come nuovo valore (sarebbe lasciato invariato dal server)
    const res = await fetch('/api/superadmin/platform-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setSaved(section ?? 'all')
      setTimeout(() => setSaved(null), 3000)
      load()
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Errore salvataggio')
    }
    setSaving(false)
  }

  async function inviaTestEmail() {
    if (!testEmail) return
    setTesting(true); setTestResult(null)
    // Salva prima le eventuali modifiche SMTP pending
    if (settings && (
      form.smtpHost !== settings.smtpHost ||
      form.smtpUser !== settings.smtpUser ||
      form.smtpPort !== settings.smtpPort ||
      (form.smtpPass && form.smtpPass !== '***')
    )) {
      await save('smtp')
    }
    const res = await fetch('/api/superadmin/platform-settings/test-smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testEmail }),
    })
    if (res.ok) setTestResult({ ok: true, msg: `Email inviata a ${testEmail}` })
    else {
      const j = await res.json().catch(() => ({}))
      setTestResult({ ok: false, msg: j.error || 'Errore invio' })
    }
    setTesting(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  if (!settings) return <div className="card text-red-600">Errore caricamento</div>

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {saved && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Impostazioni salvate
        </div>
      )}

      {/* ═══ Maintenance Mode ═══ */}
      {form.maintenanceMode && (
        <div className="card border-red-300 bg-red-50/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-700">Maintenance mode ATTIVO</p>
              <p className="text-sm text-red-600 mt-0.5">
                Le pagine pubbliche mostrano il messaggio di manutenzione. Le sezioni admin/superadmin restano accessibili.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Generale ═══ */}
      <Section title="Generale" icon={<SettingsIcon className="w-5 h-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome piattaforma">
            <input type="text" value={form.nomePiattaforma ?? ''}
              onChange={(e) => setField('nomePiattaforma', e.target.value)}
              className="input" placeholder="Otium PMS" />
          </Field>
          <Field label="URL base">
            <input type="text" value={form.urlBase ?? ''}
              onChange={(e) => setField('urlBase', e.target.value)}
              className="input" placeholder="https://otium-pms.vercel.app" />
          </Field>
          <Field label="Email supporto">
            <input type="email" value={form.emailSupporto ?? ''}
              onChange={(e) => setField('emailSupporto', e.target.value)}
              className="input" placeholder="support@otiumpms.com" />
          </Field>
          <Field label="Email noreply">
            <input type="email" value={form.emailNoreply ?? ''}
              onChange={(e) => setField('emailNoreply', e.target.value)}
              className="input" placeholder="noreply@otiumpms.com" />
          </Field>
        </div>
      </Section>

      {/* ═══ SMTP ═══ */}
      <Section
        title="SMTP piattaforma"
        icon={<Server className="w-5 h-5" />}
        hint="Usato come fallback quando l'host non ha SMTP proprio configurato."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Host">
            <input type="text" value={form.smtpHost ?? ''}
              onChange={(e) => setField('smtpHost', e.target.value)}
              className="input" placeholder="smtp.gmail.com" />
          </Field>
          <Field label="Port">
            <input type="number" value={form.smtpPort ?? ''}
              onChange={(e) => setField('smtpPort', parseInt(e.target.value) || null)}
              className="input" placeholder="587" />
          </Field>
          <Field label="User">
            <input type="text" value={form.smtpUser ?? ''}
              onChange={(e) => setField('smtpUser', e.target.value)}
              className="input" />
          </Field>
          <Field label={settings.smtpPassSet ? 'Password (configurata)' : 'Password'}>
            <div className="flex gap-2">
              <input type={showSmtpPass ? 'text' : 'password'}
                value={form.smtpPass ?? ''}
                onChange={(e) => setField('smtpPass', e.target.value)}
                placeholder={settings.smtpPassSet ? '*** (lascia invariato per non cambiare)' : ''}
                className="input flex-1" />
              <button onClick={() => setShowSmtpPass((x) => !x)}
                className="px-2 rounded bg-gray-100 hover:bg-gray-200">
                {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="From">
            <input type="text" value={form.smtpFrom ?? ''}
              onChange={(e) => setField('smtpFrom', e.target.value)}
              className="input" placeholder="Otium <noreply@otium.com>" />
          </Field>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
          <Mail className="w-5 h-5 text-gray-400" />
          <input type="email" placeholder="email-test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="input flex-1" />
          <button onClick={inviaTestEmail} disabled={testing || !testEmail || !form.smtpHost}
            className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Invia test
          </button>
        </div>
        {testResult && (
          <div className={`mt-2 p-2 rounded text-xs font-medium ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult.ok ? '✓' : '✗'} {testResult.msg}
          </div>
        )}
      </Section>

      {/* ═══ AI ═══ */}
      <Section title="AI Concierge" icon={<Bot className="w-5 h-5" />}
        hint="Platform Key usata da tutti gli host (strategia centralizzata)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Provider">
            <select value={form.aiProvider ?? 'claude'}
              onChange={(e) => setField('aiProvider', e.target.value)}
              className="input">
              <option value="claude">Anthropic Claude</option>
              <option value="openai">OpenAI</option>
              <option value="ollama">Ollama (self-host)</option>
            </select>
          </Field>
          <Field label="Modello">
            <input type="text" value={form.aiModel ?? ''}
              onChange={(e) => setField('aiModel', e.target.value)}
              className="input" placeholder="claude-haiku-4-5-20251001" />
          </Field>
          <Field label={settings.aiApiKeySet ? 'API Key (configurata)' : 'API Key'}>
            <div className="flex gap-2">
              <input type={showAiKey ? 'text' : 'password'}
                value={form.aiApiKey ?? ''}
                onChange={(e) => setField('aiApiKey', e.target.value)}
                placeholder={settings.aiApiKeySet ? '*** (lascia invariato)' : ''}
                className="input flex-1 font-mono text-xs" />
              <button onClick={() => setShowAiKey((x) => !x)}
                className="px-2 rounded bg-gray-100 hover:bg-gray-200">
                {showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="Base URL (opzionale)">
            <input type="text" value={form.aiBaseUrl ?? ''}
              onChange={(e) => setField('aiBaseUrl', e.target.value)}
              className="input" placeholder="https://openrouter.ai/api/v1" />
          </Field>
        </div>
      </Section>

      {/* ═══ Piani e prezzi ═══ */}
      <Section title="Piani e prezzi" icon={<Package className="w-5 h-5" />}
        hint="Override runtime dei prezzi hard-coded in lib/billing.ts">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="table-th">Piano</th>
                <th className="table-th">Prezzo mensile €</th>
                <th className="table-th">Prezzo annuale €</th>
              </tr>
            </thead>
            <tbody>
              {PIANI.map((p) => {
                const override = form.pianiOverride?.[p] ?? {}
                const defaults = DEFAULT_PREZZI[p]
                return (
                  <tr key={p} className="border-b border-gray-50">
                    <td className="table-td font-semibold">{PIANO_LABEL[p]}</td>
                    <td className="table-td">
                      <input type="number" step="0.01"
                        value={override.prezzoMensile ?? defaults.mese}
                        onChange={(e) => setPianoOverride(p, 'prezzoMensile', parseFloat(e.target.value) || 0)}
                        className="input w-28" />
                    </td>
                    <td className="table-td">
                      <input type="number" step="0.01"
                        value={override.prezzoAnnuale ?? defaults.anno}
                        onChange={(e) => setPianoOverride(p, 'prezzoAnnuale', parseFloat(e.target.value) || 0)}
                        className="input w-28" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Per modificare i <strong>moduli inclusi</strong> per piano, edita <code>lib/billing.ts</code> direttamente nel codice.
        </p>
      </Section>

      {/* ═══ Maintenance ═══ */}
      <Section title="Maintenance mode" icon={<AlertTriangle className="w-5 h-5" />}>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.maintenanceMode ?? false}
              onChange={(e) => setField('maintenanceMode', e.target.checked)}
              className="w-5 h-5 accent-red-500" />
            <span className="text-sm font-semibold text-gray-800">
              Attiva manutenzione (pagine pubbliche mostreranno il messaggio sotto)
            </span>
          </label>
          <Field label="Messaggio di manutenzione">
            <textarea rows={3} value={form.maintenanceMessage ?? ''}
              onChange={(e) => setField('maintenanceMessage', e.target.value)}
              className="input" placeholder="Stiamo aggiornando la piattaforma. Torniamo presto." />
          </Field>
        </div>
      </Section>

      {/* Salva globale */}
      <div className="sticky bottom-4 flex justify-end">
        <button onClick={() => save()} disabled={saving}
          className="btn-primary flex items-center gap-2 shadow-lg">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva tutte le impostazioni
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({
  title, icon, hint, children,
}: {
  title: string; icon: React.ReactNode; hint?: string; children: React.ReactNode
}) {
  return (
    <section className="card">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-brand-50 text-brand-600">{icon}</div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {hint && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
