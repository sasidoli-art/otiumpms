'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot, MessageSquare, Sparkles, BookOpen, Clock, Send,
  Copy, Check, Loader2, AlertTriangle, ChevronDown, ChevronRight, Eye, EyeOff,
} from 'lucide-react'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type ConciergeConfig = {
  conciergeAttivo: boolean
  conciergeProvider: string | null
  conciergeApiKey: string
  conciergeApiKeySet: boolean
  conciergeModel: string | null
  conciergeBaseUrl: string | null
  conciergeSystemPrompt: string | null
  conciergeTemperatura: number | null
  conciergeMaxToken: number | null
  conciergeKnowledgeBase: string | null
  conciergeLinguaDefault: string | null
  conciergeAutoEscalation: number | null
  conciergeOrariAttiviDa: string | null
  conciergeOrariAttiviA: string | null
  conciergeMessaggioFuoriOrario: string | null
  whatsappNumeroId: string | null
  whatsappAccessToken: string
  whatsappAccessTokenSet: boolean
  whatsappVerifyToken: string | null
}

type ChatTurn = { ruolo: 'user' | 'assistant'; testo: string }

const PROVIDERS = [
  { id: 'claude', label: 'Anthropic (Claude)', default: 'claude-haiku-4-5-20251001' },
  { id: 'openai', label: 'OpenAI / compatibile', default: 'gpt-4o-mini' },
  { id: 'ollama', label: 'Ollama (self-hosted)', default: 'llama3.1' },
] as const

const LINGUE = [
  { id: 'it', label: 'Italiano' },
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'es', label: 'Español' },
]

// ────────────────────────────────────────────────────────────────────────────
// Componente principale
// ────────────────────────────────────────────────────────────────────────────

export default function ConciergeConfigComponent({ hostId }: { hostId: string }) {
  const [cfg, setCfg] = useState<ConciergeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const webhookUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/api/webhook/whatsapp/${hostId}`
  }, [hostId])

  const carica = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/host/concierge/config')
      if (res.ok) setCfg(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { carica() }, [carica])

  async function salva() {
    if (!cfg) return
    setSaving(true); setErrore(null)
    try {
      const body: Record<string, unknown> = { ...cfg }
      // La UI mantiene '••••••••' per non cambiare i secret, stringa vuota per cancellarli
      delete body.conciergeApiKeySet
      delete body.whatsappAccessTokenSet

      const res = await fetch('/api/host/concierge/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Errore salvataggio')
      }
      setSavedAt(new Date())
      await carica()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !cfg) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const disabled = !cfg.conciergeAttivo

  return (
    <div className="space-y-5 max-w-3xl">
      {errore && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errore}
        </div>
      )}

      {/* ─── Sezione 1: Attivazione ─────────────────────────────────── */}
      <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.conciergeAttivo ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Concierge AI attivo</h2>
              <p className="text-sm text-gray-500">
                {cfg.conciergeAttivo
                  ? 'Il bot risponde automaticamente agli ospiti su WhatsApp.'
                  : 'Il bot è spento. I messaggi arrivano direttamente a te.'}
              </p>
            </div>
          </div>
          <Toggle
            checked={cfg.conciergeAttivo}
            onChange={(v) => setCfg((c) => c && { ...c, conciergeAttivo: v })}
          />
        </div>
      </section>

      <Wrapper disabled={disabled}>
        {/* ─── Sezione 2: WhatsApp ──────────────────────────────────── */}
        <Section icon={MessageSquare} title="WhatsApp Business" tone="emerald">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Phone Number ID">
              <input
                type="text"
                value={cfg.whatsappNumeroId ?? ''}
                onChange={(e) => setCfg((c) => c && { ...c, whatsappNumeroId: e.target.value })}
                placeholder="1234567890"
                className={inp}
              />
            </Field>
            <Field label="Verify Token">
              <input
                type="text"
                value={cfg.whatsappVerifyToken ?? ''}
                onChange={(e) => setCfg((c) => c && { ...c, whatsappVerifyToken: e.target.value })}
                placeholder="otium-verify-xxx"
                className={inp}
              />
            </Field>
          </div>
          <Field label="Access Token">
            <SecretInput
              value={cfg.whatsappAccessToken}
              isSet={cfg.whatsappAccessTokenSet}
              onChange={(v) => setCfg((c) => c && { ...c, whatsappAccessToken: v })}
              placeholder="EAAx..."
            />
          </Field>

          <Field label="URL Webhook (da configurare su Meta Business Manager)">
            <CopyableUrl value={webhookUrl} />
          </Field>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Webhook signature:</strong> la verifica HMAC usa l&apos;App Secret Meta
              (platform-wide, env <code className="px-1 bg-amber-100 rounded">WHATSAPP_APP_SECRET</code>).
              Non è un campo per-host.
            </div>
          </div>

          <TestWhatsAppButton />
          <InstructionsMetaCollapsible />
        </Section>

        {/* ─── Sezione 3: AI ────────────────────────────────────────── */}
        <Section icon={Sparkles} title="Intelligenza artificiale" tone="indigo">
          <Field label="Provider">
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setCfg((c) => c && {
                      ...c,
                      conciergeProvider: p.id,
                      conciergeModel: c.conciergeModel || p.default,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                    cfg.conciergeProvider === p.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Modello" hint="Vuoto = default provider">
              <input
                type="text"
                value={cfg.conciergeModel ?? ''}
                onChange={(e) => setCfg((c) => c && { ...c, conciergeModel: e.target.value })}
                className={inp}
                placeholder="claude-haiku-4-5-20251001"
              />
            </Field>
            <Field label="Base URL" hint="Solo per gateway custom (OpenRouter, Ollama)">
              <input
                type="text"
                value={cfg.conciergeBaseUrl ?? ''}
                onChange={(e) => setCfg((c) => c && { ...c, conciergeBaseUrl: e.target.value })}
                className={inp}
                placeholder="https://api.anthropic.com"
              />
            </Field>
          </div>

          <Field label="API key (opzionale — se vuoto, usa chiave piattaforma)">
            <SecretInput
              value={cfg.conciergeApiKey}
              isSet={cfg.conciergeApiKeySet}
              onChange={(v) => setCfg((c) => c && { ...c, conciergeApiKey: v })}
              placeholder="sk-ant-..."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={`Temperatura: ${cfg.conciergeTemperatura ?? 0.7}`} hint="0 = deterministico, 1 = creativo">
              <input
                type="range"
                min={0} max={1} step={0.1}
                value={cfg.conciergeTemperatura ?? 0.7}
                onChange={(e) => setCfg((c) => c && { ...c, conciergeTemperatura: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </Field>
            <Field label="Max token risposta" hint="50-2000 (default 500)">
              <input
                type="number"
                min={50} max={2000}
                value={cfg.conciergeMaxToken ?? 500}
                onChange={(e) => setCfg((c) => c && { ...c, conciergeMaxToken: Number(e.target.value) })}
                className={inp}
              />
            </Field>
          </div>

          <Field
            label="Prompt di sistema"
            hint="Regole comportamentali e info extra da passare all'AI"
          >
            <textarea
              rows={6}
              value={cfg.conciergeSystemPrompt ?? ''}
              onChange={(e) => setCfg((c) => c && { ...c, conciergeSystemPrompt: e.target.value })}
              className={inp}
              placeholder={`Ricorda di suggerire sempre il nostro ristorante panoramico.\nLa navetta per il centro parte ogni ora dalle 9 alle 22.\nIn caso di allergie, indirizza sempre al capo-cucina.`}
            />
          </Field>
        </Section>

        {/* ─── Sezione 4: Knowledge Base ───────────────────────────── */}
        <Section icon={BookOpen} title="Knowledge base" tone="amber">
          <p className="text-xs text-gray-600">
            Più informazioni dai al concierge, migliori saranno le risposte.
            Pensa a tutte le domande che gli ospiti ti fanno di solito.
          </p>
          <Field
            label={`Contenuto (${(cfg.conciergeKnowledgeBase ?? '').length}/10000)`}
            hint="FAQ, orari, servizi, zona, ristoranti consigliati, parcheggio..."
          >
            <textarea
              rows={10}
              maxLength={10000}
              value={cfg.conciergeKnowledgeBase ?? ''}
              onChange={(e) => setCfg((c) => c && { ...c, conciergeKnowledgeBase: e.target.value })}
              className={inp}
              placeholder={`CHECK-IN: dalle 14:00. Late check-in con avviso entro le 18.
CHECK-OUT: entro le 11. Late check-out €20/h fino a 14:00.

WI-FI: rete "Otium-Guest", password a reception.

COLAZIONE: 7:30-10:00, buffet continentale.

PARCHEGGIO: gratuito, 20 posti. Prenotazione consigliata agosto.

RISTORANTI CONSIGLIATI:
- La Terrazza (50m, alta cucina, prenotare)
- Da Nino (500m, trattoria, economico)

ZONA: centro storico a 10 min a piedi. Spiaggia 15 min in auto.
Noleggio bici €10/giorno in reception.`}
            />
          </Field>
        </Section>

        {/* ─── Sezione 5: Comportamento ────────────────────────────── */}
        <Section icon={Clock} title="Comportamento" tone="violet">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Lingua default (fallback)" hint="Il bot risponde nella lingua dell'ospite quando nota">
              <select
                value={cfg.conciergeLinguaDefault ?? 'it'}
                onChange={(e) => setCfg((c) => c && { ...c, conciergeLinguaDefault: e.target.value })}
                className={inp}
              >
                {LINGUE.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Auto-escalation dopo N messaggi AI" hint="0 = disabilitato">
              <input
                type="number"
                min={0} max={100}
                value={cfg.conciergeAutoEscalation ?? 10}
                onChange={(e) => setCfg((c) => c && { ...c, conciergeAutoEscalation: Number(e.target.value) })}
                className={inp}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Orari attivi — da (HH:MM)" hint="Vuoto = sempre attivo">
              <input
                type="time"
                value={cfg.conciergeOrariAttiviDa ?? ''}
                onChange={(e) => setCfg((c) => c && { ...c, conciergeOrariAttiviDa: e.target.value || null })}
                className={inp}
              />
            </Field>
            <Field label="Orari attivi — a (HH:MM)">
              <input
                type="time"
                value={cfg.conciergeOrariAttiviA ?? ''}
                onChange={(e) => setCfg((c) => c && { ...c, conciergeOrariAttiviA: e.target.value || null })}
                className={inp}
              />
            </Field>
          </div>

          <Field label="Messaggio fuori orario">
            <textarea
              rows={3}
              value={cfg.conciergeMessaggioFuoriOrario ?? ''}
              onChange={(e) => setCfg((c) => c && { ...c, conciergeMessaggioFuoriOrario: e.target.value })}
              className={inp}
              placeholder="La reception è chiusa. Ti risponderemo domattina dalle 8:00. Per emergenze chiama il 112."
            />
          </Field>
        </Section>

        {/* ─── Sezione 6: Test ──────────────────────────────────────── */}
        <Section icon={Send} title="Prova il concierge" tone="sky">
          <p className="text-xs text-gray-600">
            Scrivi un messaggio e verifica come risponde il tuo concierge con le impostazioni salvate.
            Questo test NON invia nulla su WhatsApp.
          </p>
          <TestChat />
        </Section>
      </Wrapper>

      {/* ─── Sticky save ─────────────────────────────────────────── */}
      <div className="sticky bottom-4 flex justify-end">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white shadow-lg border border-gray-200">
          {savedAt && (
            <span className="text-xs text-gray-500">
              Salvato {savedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={salva}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Salva configurazione
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Sotto-componenti
// ────────────────────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

function Wrapper({ disabled, children }: { disabled: boolean; children: React.ReactNode }) {
  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

const TONES: Record<string, { bg: string; icon: string }> = {
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-500 text-white' },
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-500 text-white' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-500 text-white' },
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-500 text-white' },
  sky: { bg: 'bg-sky-50', icon: 'bg-sky-500 text-white' },
}

function Section({ icon: Icon, title, tone, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  tone: keyof typeof TONES
  children: React.ReactNode
}) {
  const t = TONES[tone]
  return (
    <section className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <header className={`flex items-center gap-3 px-5 py-3 border-b border-gray-100 ${t.bg}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </header>
      <div className="p-5 space-y-3">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function SecretInput({
  value, isSet, onChange, placeholder,
}: {
  value: string; isSet: boolean; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex gap-1">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSet ? '••••••••' : placeholder}
        className={inp}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="px-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        {show ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
      </button>
    </div>
  )
}

function CopyableUrl({ value }: { value: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
      <code className="flex-1 text-xs text-gray-700 break-all font-mono">{value}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value)
          setDone(true)
          setTimeout(() => setDone(false), 2000)
        }}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded"
      >
        {done ? <><Check className="w-3 h-3" /> Copiato</> : <><Copy className="w-3 h-3" /> Copia</>}
      </button>
    </div>
  )
}

function TestWhatsAppButton() {
  const [destinatario, setDestinatario] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function invia() {
    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/host/concierge/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatario }),
      })
      const j = await res.json()
      setResult({
        ok: !!j.ok,
        msg: j.ok ? `Inviato (ID: ${j.messageId})` : j.error || j.dettagli || 'Errore',
      })
    } catch {
      setResult({ ok: false, msg: 'Errore di rete' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
      <label className="text-xs font-semibold text-gray-700">Invia un messaggio di test</label>
      <div className="flex gap-2">
        <input
          type="tel"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          placeholder="+393331234567"
          className={inp}
        />
        <button
          onClick={invia}
          disabled={sending || !destinatario.startsWith('+')}
          className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Invia
        </button>
      </div>
      {result && (
        <div className={`text-xs p-2 rounded ${result.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {result.ok ? '✓' : '✕'} {result.msg}
        </div>
      )}
    </div>
  )
}

function InstructionsMetaCollapsible() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Come configurare Meta Business Manager
        </span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 py-3 text-xs text-gray-600 space-y-2 border-t border-gray-200">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Accedi a <a href="https://business.facebook.com" target="_blank" rel="noopener" className="text-indigo-600 underline">Meta Business Manager</a>.</li>
            <li>Crea/seleziona una WhatsApp Business App in &quot;Gestione app&quot;.</li>
            <li>In <strong>API configuration</strong>, copia il <strong>Phone Number ID</strong> e incollalo qui sopra.</li>
            <li>Genera un <strong>Permanent Access Token</strong> (richiede system user) e incollalo qui sopra.</li>
            <li>In <strong>Webhooks → WhatsApp Business Account</strong>, clicca &quot;Configure webhook&quot;.</li>
            <li>Incolla l&apos;URL webhook mostrato sopra come Callback URL.</li>
            <li>Imposta un <strong>Verify Token</strong> a tua scelta (es. <code>otium-verify-xxx</code>) e ripetilo qui sopra nel campo Verify Token.</li>
            <li>Sottoscrivi il campo <strong>messages</strong>.</li>
            <li>Salva sia qui sia su Meta. Usa &quot;Invia messaggio di test&quot; per verificare.</li>
          </ol>
        </div>
      )}
    </div>
  )
}

function TestChat() {
  const [turni, setTurni] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  async function invia() {
    if (!input.trim() || sending) return
    const userTurn: ChatTurn = { ruolo: 'user', testo: input }
    setTurni((t) => [...t, userTurn])
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/host/concierge/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testo: input,
          storia: turni,
        }),
      })
      const j = await res.json()
      const risposta = j.ok ? j.risposta : `Errore: ${j.error ?? 'sconosciuto'}`
      setTurni((t) => [...t, { ruolo: 'assistant', testo: risposta }])
    } catch {
      setTurni((t) => [...t, { ruolo: 'assistant', testo: 'Errore di rete' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="max-h-80 min-h-40 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {turni.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-6">Prova con: &ldquo;A che ora è la colazione?&rdquo;</p>
        )}
        {turni.map((t, i) => (
          <div
            key={i}
            className={`flex ${t.ruolo === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                t.ruolo === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
              }`}
            >
              {t.testo}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl bg-white border border-gray-200">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 p-2 border-t border-gray-200 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              invia()
            }
          }}
          placeholder="Scrivi un messaggio..."
          className={inp}
        />
        <button
          onClick={invia}
          disabled={sending || !input.trim()}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
