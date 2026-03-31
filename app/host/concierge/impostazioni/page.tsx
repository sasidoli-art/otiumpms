'use client'

import { useState, useEffect } from 'react'
import { Settings, Loader2, Check, Bot, Globe, Key } from 'lucide-react'
import { useRouter } from 'next/navigation'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function ConciergeSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successo, setSuccesso] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    conciergeAttivo: false,
    conciergeProvider: 'ollama',
    conciergeApiKey: '',
    conciergeModel: 'llama3.1',
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
          conciergeSystemPrompt: d.conciergeSystemPrompt || '',
          whatsappNumeroId: d.whatsappNumeroId || '',
          whatsappAccessToken: d.whatsappAccessToken || '',
          whatsappVerifyToken: d.whatsappVerifyToken || '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

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
          <h1 className="page-title flex items-center gap-2"><Settings className="w-6 h-6 text-purple-500" /> Impostazioni Concierge</h1>
          <p className="text-sm text-gray-500">Configura provider AI e collegamento WhatsApp</p>
        </div>
      </div>

      {/* Attivo/disattivo */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-purple-500" />
          <div>
            <p className="text-sm font-semibold">AI Concierge</p>
            <p className="text-xs text-gray-400">{form.conciergeAttivo ? 'Attivo — risponde automaticamente' : 'Disattivo'}</p>
          </div>
        </div>
        <button onClick={() => setForm(f => ({ ...f, conciergeAttivo: !f.conciergeAttivo }))}
          className={`w-12 h-7 rounded-full relative transition-colors ${form.conciergeAttivo ? 'bg-purple-500' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.conciergeAttivo ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Provider AI */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Key className="w-4 h-4 text-gray-500" /> Provider AI</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'ollama', label: 'Ollama (gratis)', desc: 'Locale, zero costi' },
            { id: 'claude', label: 'Claude', desc: 'Anthropic API' },
            { id: 'openai', label: 'OpenAI', desc: 'GPT-4o / GPT-4o-mini' },
          ].map(p => (
            <button key={p.id} onClick={() => setForm(f => ({ ...f, conciergeProvider: p.id }))}
              className={`p-3 rounded-lg border-2 text-left text-xs transition-all ${form.conciergeProvider === p.id ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-slate-600'}`}>
              <p className="font-semibold">{p.label}</p>
              <p className="text-gray-400 mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
        {form.conciergeProvider !== 'ollama' && (
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">API Key</label>
            <input type="password" value={form.conciergeApiKey} onChange={e => setForm(f => ({ ...f, conciergeApiKey: e.target.value }))} placeholder={form.conciergeProvider === 'claude' ? 'sk-ant-...' : 'sk-...'} className={inp} />
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Modello</label>
          <input type="text" value={form.conciergeModel} onChange={e => setForm(f => ({ ...f, conciergeModel: e.target.value }))} className={inp} placeholder="llama3.1 / claude-haiku-4-5-20251001 / gpt-4o-mini" />
        </div>
      </div>

      {/* System prompt */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold">Informazioni hotel (System Prompt)</h3>
        <p className="text-xs text-gray-400">Scrivi le informazioni che l'AI deve sapere: orari colazione, checkout, Wi-Fi, ristorante, parcheggio, servizi, ecc.</p>
        <textarea value={form.conciergeSystemPrompt} onChange={e => setForm(f => ({ ...f, conciergeSystemPrompt: e.target.value }))} rows={8} className={inp}
          placeholder="Colazione 7:30-10:00 al ristorante La Terrazza.&#10;Checkout ore 11:00. Late checkout possibile fino alle 14:00 su richiesta.&#10;Wi-Fi: OtiumGuest / password1234&#10;Parcheggio gratuito nel cortile interno.&#10;SPA aperta 9:00-20:00, prenotazione obbligatoria." />
      </div>

      {/* WhatsApp */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-green-500" /> WhatsApp Business</h3>
        <p className="text-xs text-gray-400">Credenziali Meta Cloud API. Necessarie solo per la produzione — il simulatore funziona senza.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Phone Number ID</label>
            <input type="text" value={form.whatsappNumeroId} onChange={e => setForm(f => ({ ...f, whatsappNumeroId: e.target.value }))} className={inp} placeholder="1234567890" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Verify Token</label>
            <input type="text" value={form.whatsappVerifyToken} onChange={e => setForm(f => ({ ...f, whatsappVerifyToken: e.target.value }))} className={inp} placeholder="myverifytoken123" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Access Token</label>
          <input type="password" value={form.whatsappAccessToken} onChange={e => setForm(f => ({ ...f, whatsappAccessToken: e.target.value }))} className={inp} placeholder="EAAx..." />
        </div>
      </div>

      {/* Salva */}
      <button onClick={salva} disabled={saving}
        className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${successo ? 'bg-green-500 text-white' : 'btn-primary'}`}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : successo ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
        {saving ? 'Salvo...' : successo ? 'Salvato!' : 'Salva impostazioni'}
      </button>
    </div>
  )
}
