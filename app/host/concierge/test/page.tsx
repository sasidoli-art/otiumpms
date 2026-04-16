'use client'

import { useState, useEffect } from 'react'
import { Bot, Send, Loader2, User, Sparkles, AlertTriangle, Save, Check, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

type Msg = { role: 'user' | 'ai'; text: string; tools?: string[]; tokens?: number | null }

const TEMPLATES = [
  { label: 'Orari e servizi', text: 'Colazione: 7:30-10:30 nel salone piano terra.\nCheck-in: dalle 15:00.\nCheck-out: entro le 10:00.\nWi-Fi: rete "Hotel_Guest", password alla reception.\nPiscina: aperta 9:00-19:00 (giugno-settembre).\nParcheggio: gratuito, 20 posti.' },
  { label: 'Attività ed escursioni', text: 'Gite a cavallo: martedì e giovedì, €45/persona (prenotare 24h prima).\nNoleggio biciclette: €15/giorno alla reception.\nVisite guidate: ogni sabato mattina centro storico, €20/persona.\nSpiaggia convenzionata: 10 min in auto, navetta gratuita ore 9 e 11.' },
  { label: 'Ristorazione', text: 'Ristorante: aperto cena 19:30-22:00 (chiuso lunedì).\nMenu fisso: €35, 4 portate + acqua e vino della casa.\nMenu bambini: €18.\nAllergie: comunicate al cameriere, cucina attrezzata per celiaci.\nRoom service: disponibile 12:00-22:00, supplemento €5.' },
  { label: 'SPA e benessere', text: 'SPA: aperta 10:00-20:00.\nMassaggio rilassante 50min: €70.\nPercorso benessere 2h: €40/persona.\nPrenotazione obbligatoria (almeno 3h prima).\nAccappatoio e ciabatte forniti.' },
  { label: 'Contatti e emergenze', text: 'Reception: disponibile 24/7, interno 0 dal telefono in camera.\nNumero diretto: +39 080 123 4567.\nEmergenze mediche: guardia medica a 5 min, chiamiamo noi.\nFarmacia più vicina: Via Roma 12, aperta 8:30-13:00 / 16:00-20:00.' },
]

export default function ConciergeTestPage() {
  const t = useTranslations('host.concierge')
  const [telefono, setTelefono] = useState('+393331234567')
  const [nome, setNome] = useState('Test Ospite')
  const [input, setInput] = useState('')
  const [messaggi, setMessaggi] = useState<Msg[]>([])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Training panel state
  const [systemPrompt, setSystemPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/host/profilo')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.conciergeSystemPrompt) setSystemPrompt(d.conciergeSystemPrompt)
      })
      .catch(() => {})
      .finally(() => setPromptLoading(false))
  }, [])

  async function savePrompt() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/host/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conciergeSystemPrompt: systemPrompt || null }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {}
    setSaving(false)
  }

  function appendTemplate(text: string) {
    setSystemPrompt(prev => prev ? `${prev}\n\n${text}` : text)
  }

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const testo = input
    setInput('')
    setMessaggi(prev => [...prev, { role: 'user', text: testo }])
    setLoading(true); setErrore(null)

    try {
      const res = await fetch('/api/host/concierge/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, nome, testo }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrore(data.error || 'Errore')
        if (data.hint) setErrore(prev => `${prev}\n${data.hint}`)
      } else {
        setMessaggi(prev => [...prev, {
          role: 'ai',
          text: data.response || '(nessuna risposta)',
          tools: data.toolsUsed,
          tokens: data.tokensUsed,
        }])
      }
    } catch (err) {
      setErrore(`Errore di rete: ${String(err)}`)
    }
    setLoading(false)
  }

  const inp = 'px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'
  const charCount = systemPrompt.length
  const charWarning = charCount > 4000

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 max-w-[1400px] mx-auto">
      {/* LEFT: Chat simulator (3 cols) */}
      <div className="xl:col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" /> {t('simulatorTitle')}
            </h1>
            <p className="text-xs text-gray-500">{t('simulatorSubtitle')}</p>
          </div>
          <Link href="/host/concierge" className="btn-secondary text-xs">{t('simulatorDashboard')}</Link>
        </div>

        <div className="card flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-gray-500">{t('simulatedPhone')}</label>
            <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className={inp + ' w-full'} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-500">{t('guestName')}</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} className={inp + ' w-full'} />
          </div>
        </div>

        {errore && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {errore}
          </div>
        )}

        <div className="card min-h-[400px] max-h-[60vh] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
          {messaggi.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <Bot className="w-16 h-16 opacity-30 mb-3" />
              <p className="text-sm">{t('startMessage')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('suggestions')}</p>
            </div>
          )}
          {messaggi.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? '' : 'flex-row-reverse'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-gray-200 dark:bg-slate-600' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-purple-600" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600' : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'}`}>
                <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                {m.tools && m.tools.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {m.tools.map(t => <span key={t} className="text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded">{t}</span>)}
                  </div>
                )}
                {m.tokens && <p className="text-[9px] text-gray-500 mt-1">{m.tokens} tokens</p>}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><Bot className="w-4 h-4 text-purple-600 animate-pulse" /></div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl px-4 py-3 border border-purple-200 dark:border-purple-800">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={invia} className="flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} disabled={loading}
            placeholder={t('messagePlaceholder')}
            className={`flex-1 ${inp} py-3`}
            autoFocus />
          <button type="submit" disabled={loading || !input.trim()}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* RIGHT: Training panel (2 cols) */}
      <div className="xl:col-span-2 space-y-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" /> Addestra il tuo Concierge
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Scrivi qui tutte le informazioni che l&apos;AI deve conoscere.
            Salva e testa subito a sinistra.
          </p>
        </div>

        <div className="card space-y-3">
          {promptLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={16}
                placeholder="Es: Colazione 7:30-10:30 nel salone piano terra. Check-in dalle 15. Wi-Fi password: OtiumGuest2026. Piscina aperta 9-19 (giugno-settembre). Gite a cavallo martedì e giovedì €45/persona..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200 resize-y leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${charWarning ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                  {charCount} caratteri{charWarning && ' (sopra 4000 = costi token piu alti)'}
                </span>
                <button
                  onClick={savePrompt}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    saved ? 'bg-emerald-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                  } disabled:opacity-50`}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Salvo...' : saved ? 'Salvato!' : 'Salva'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Template buttons */}
        <div className="card space-y-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300">Template rapidi</h3>
          <p className="text-[11px] text-gray-500">
            Clicca per aggiungere. Poi modifica con le info reali della tua struttura.
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {TEMPLATES.map(tmpl => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => appendTemplate(tmpl.text)}
                className="text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 transition-colors"
              >
                <span className="font-semibold">{tmpl.label}</span>
                <span className="text-gray-400 ml-2">{tmpl.text.slice(0, 60)}...</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
            <strong>Come funziona:</strong> tutto quello che scrivi qui viene passato
            all&apos;AI come &quot;informazioni hotel&quot;. Quando un ospite chiede
            &quot;a che ora apre la piscina?&quot;, l&apos;AI cerca qui la risposta.
            Piu scrivi, piu l&apos;AI sa. Se non trova la risposta, dira
            all&apos;ospite di contattare la reception.
          </p>
        </div>
      </div>
    </div>
  )
}
