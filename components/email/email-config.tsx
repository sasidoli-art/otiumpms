'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Mail, Eye, Pencil, Send, RotateCcw, Loader2, X, Save, CheckCircle2,
  Clock, User, Building2, Sparkles,
} from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Destinatario = 'ospite' | 'host' | 'staff'

type EmailTemplate = {
  id: string
  nome: string
  trigger: string
  destinatario: Destinatario
  configurabileHost: boolean
  ritardo: number
  marketing?: boolean
}

type ConfigItem = {
  template: EmailTemplate
  config: {
    attiva: boolean
    oggettoCustom: string | null
    messaggioCustom: string | null
    ritardoOre: number | null
    updatedAt: string
  } | null
}

type Lingua = 'it' | 'en' | 'de' | 'fr'

// ─── Componente principale ────────────────────────────────────────────────────

export default function EmailConfig() {
  const [items, setItems] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [erroreGlobale, setErroreGlobale] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/host/email-automatiche/config')
    if (res.ok) {
      const data = await res.json()
      setItems(data.items)
    } else {
      setErroreGlobale('Errore caricamento configurazione')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleAttiva(templateId: string, attiva: boolean) {
    const res = await fetch('/api/host/email-automatiche/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, attiva }),
    })
    if (res.ok) load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {erroreGlobale && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{erroreGlobale}</div>
      )}

      <div className="grid gap-4">
        {items.map((item) => (
          <TemplateCard
            key={item.template.id}
            item={item}
            onToggle={(a) => toggleAttiva(item.template.id, a)}
            onPreview={() => setPreviewTemplate(item.template)}
            onEdit={() => setEditingTemplate(item.template)}
          />
        ))}
      </div>

      {editingTemplate && (
        <EditorModal
          template={editingTemplate}
          configIniziale={items.find((i) => i.template.id === editingTemplate.id)?.config ?? null}
          onClose={() => setEditingTemplate(null)}
          onSaved={() => { setEditingTemplate(null); load() }}
        />
      )}

      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  )
}

// ─── Template card ───────────────────────────────────────────────────────────

function TemplateCard({
  item, onToggle, onPreview, onEdit,
}: {
  item: ConfigItem
  onToggle: (a: boolean) => void
  onPreview: () => void
  onEdit: () => void
}) {
  const { template, config } = item
  const attiva = config?.attiva ?? true
  const personalizzato = !!(config?.oggettoCustom || config?.messaggioCustom)

  const destIcon = template.destinatario === 'ospite'
    ? <User className="w-4 h-4" />
    : template.destinatario === 'host'
    ? <Building2 className="w-4 h-4" />
    : <Sparkles className="w-4 h-4" />

  return (
    <div className={`card transition-opacity ${attiva ? '' : 'opacity-70'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl shrink-0 ${attiva ? 'bg-brand-500/10' : 'bg-gray-100'}`}>
            <Mail className={`w-5 h-5 ${attiva ? 'text-brand-500' : 'text-gray-400'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">{template.nome}</h3>
              {personalizzato && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold">
                  Personalizzato
                </span>
              )}
              {template.marketing && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                  Marketing
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{template.trigger}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                {destIcon}
                {template.destinatario === 'ospite' ? 'Ospite' : template.destinatario === 'host' ? 'Host' : 'Staff'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRitardo(config?.ritardoOre ?? template.ritardo)}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(!attiva)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            attiva ? 'bg-brand-500' : 'bg-gray-300'
          }`}
          aria-label={attiva ? 'Disattiva email' : 'Attiva email'}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            attiva ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={onPreview}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" /> Anteprima
        </button>
        {template.configurabileHost && (
          <button
            onClick={onEdit}
            className="text-sm px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> Personalizza
          </button>
        )}
      </div>
    </div>
  )
}

function formatRitardo(ore: number | null | undefined): string {
  if (ore == null || ore === 0) return 'Immediato'
  if (ore < 0) {
    const abs = Math.abs(ore)
    if (abs >= 24) return `${Math.floor(abs / 24)}g prima dell'evento`
    return `${abs}h prima dell'evento`
  }
  if (ore >= 24) return `${Math.floor(ore / 24)}g dopo`
  return `${ore}h dopo`
}

// ─── Preview modal ───────────────────────────────────────────────────────────

function PreviewModal({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const [html, setHtml] = useState('')
  const [subject, setSubject] = useState('')
  const [lingua, setLingua] = useState<Lingua>('it')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const res = await fetch('/api/host/email-automatiche/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, lingua }),
      })
      if (res.ok) {
        const d = await res.json()
        setHtml(d.html); setSubject(d.subject)
      }
      setLoading(false)
    })()
  }, [template.id, lingua])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Anteprima: {template.nome}</h3>
            <p className="text-xs text-gray-500">Con dati di esempio</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={lingua}
              onChange={(e) => setLingua(e.target.value as Lingua)}
              className="text-sm px-2 py-1 rounded border border-gray-200 bg-white"
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
            </select>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-sm">
          <span className="text-gray-500">Oggetto:</span> <span className="font-medium text-gray-800">{subject}</span>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            </div>
          ) : (
            <iframe
              srcDoc={html}
              title="Preview email"
              className="w-full min-h-[600px] bg-white rounded-lg border border-gray-200"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Editor modal ────────────────────────────────────────────────────────────

function EditorModal({
  template, configIniziale, onClose, onSaved,
}: {
  template: EmailTemplate
  configIniziale: ConfigItem['config']
  onClose: () => void
  onSaved: () => void
}) {
  const [oggetto, setOggetto] = useState(configIniziale?.oggettoCustom ?? '')
  const [messaggio, setMessaggio] = useState(configIniziale?.messaggioCustom ?? '')
  const [lingua, setLingua] = useState<Lingua>('it')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [errore, setErrore] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Preview live (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => refreshPreview(), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oggetto, messaggio, lingua])

  async function refreshPreview() {
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/host/email-automatiche/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          oggettoCustom: oggetto || null,
          messaggioCustom: messaggio || null,
          lingua,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setPreviewHtml(d.html); setPreviewSubject(d.subject)
      }
    } finally {
      setPreviewLoading(false)
    }
  }

  async function save() {
    setSaving(true); setErrore(''); setFeedback('')
    const res = await fetch('/api/host/email-automatiche/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.id,
        attiva: configIniziale?.attiva ?? true,
        oggettoCustom: oggetto || null,
        messaggioCustom: messaggio || null,
      }),
    })
    if (res.ok) onSaved()
    else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore salvataggio')
    }
    setSaving(false)
  }

  async function inviaTest() {
    setTesting(true); setErrore(''); setFeedback('')
    const res = await fetch('/api/host/email-automatiche/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.id,
        oggettoCustom: oggetto || null,
        messaggioCustom: messaggio || null,
        lingua,
      }),
    })
    if (res.ok) {
      const d = await res.json()
      setFeedback(`Email di test inviata a ${d.to}`)
    } else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore invio')
    }
    setTesting(false)
  }

  async function ripristina() {
    if (!window.confirm('Ripristinare i valori predefiniti? Le tue personalizzazioni andranno perse.')) return
    setRestoring(true); setErrore('')
    const res = await fetch(`/api/host/email-automatiche/config?templateId=${template.id}`, {
      method: 'DELETE',
    })
    if (res.ok) onSaved()
    else setErrore('Errore ripristino')
    setRestoring(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Personalizza: {template.nome}</h3>
            <p className="text-xs text-gray-500">{template.trigger}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
          {/* Editor */}
          <div className="overflow-y-auto p-5 space-y-4 border-r border-gray-100">
            <div>
              <label className="label">Lingua anteprima</label>
              <select
                value={lingua}
                onChange={(e) => setLingua(e.target.value as Lingua)}
                className="input"
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div>
              <label className="label">Oggetto custom</label>
              <input
                type="text"
                value={oggetto}
                onChange={(e) => setOggetto(e.target.value)}
                placeholder="Lascia vuoto per usare l'oggetto predefinito"
                className="input"
                maxLength={200}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Se vuoto, viene usato l&apos;oggetto standard del template.
              </p>
            </div>

            <div>
              <label className="label">Messaggio aggiuntivo</label>
              <textarea
                rows={8}
                value={messaggio}
                onChange={(e) => setMessaggio(e.target.value)}
                placeholder={`Es. Per il check-in sei pregato di presentarti tra le 15 e le 20. Il parcheggio è gratuito — chiedi le chiavi al tuo arrivo.\n\nQuesto testo viene aggiunto in coda al template standard, non lo sostituisce.`}
                className="input font-mono text-xs"
                maxLength={5000}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {messaggio.length}/5000 caratteri. Puoi andare a capo con Invio. L&apos;HTML non e&apos; supportato.
              </p>
            </div>

            {feedback && (
              <div className="p-2.5 rounded-lg bg-green-50 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {feedback}
              </div>
            )}
            {errore && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-sm">{errore}</div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salva
              </button>
              <button
                onClick={inviaTest}
                disabled={testing}
                className="btn-secondary flex items-center gap-2"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Invia test
              </button>
              <button
                onClick={ripristina}
                disabled={restoring || !configIniziale}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Ripristina default
              </button>
            </div>
          </div>

          {/* Preview live */}
          <div className="overflow-hidden flex flex-col bg-gray-100">
            <div className="px-4 py-2 border-b border-gray-200 bg-white text-sm flex items-center gap-2">
              <span className="text-gray-500 shrink-0">Oggetto:</span>
              <span className="font-medium text-gray-800 truncate">{previewSubject || '—'}</span>
              {previewLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-400 ml-auto" />}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  title="Preview live"
                  className="w-full min-h-[560px] bg-white rounded-lg border border-gray-200"
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                  Caricamento anteprima…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
