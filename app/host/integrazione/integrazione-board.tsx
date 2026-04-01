'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Code, Copy, CheckCircle2, Globe, ExternalLink, Loader2, Smartphone,
  Monitor, Link2, Sparkles,
} from 'lucide-react'

type Snippet = {
  struttura: string
  bookUrl: string
  snippets: {
    bottoneFisso: string
    formInline: string
    linkDiretto: string
    iframe: string
    urlPrenotazione: string
    urlSpa: string
    urlPacchetti: string
  }
}

export default function IntegrazioneBoard() {
  const [strutture, setStrutture] = useState<{ id: string; nome: string }[]>([])
  const [strutturaId, setStrutturaId] = useState('')
  const [snippet, setSnippet] = useState<Snippet | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/host/strutture')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const list = data.map((s: { id: string; nome: string }) => ({ id: s.id, nome: s.nome }))
          setStrutture(list)
          if (list.length > 0) setStrutturaId(list[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!strutturaId) return
    fetch(`/api/host/widget?strutturaId=${strutturaId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setSnippet(d))
  }, [strutturaId])

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Code className="w-6 h-6 text-brand-500" /> Integrazione sito
          </h1>
          <p className="text-sm text-gray-500">Aggiungi il booking al tuo sito web in 2 minuti</p>
        </div>
      </div>

      {/* Selezione struttura */}
      {strutture.length > 1 && (
        <div className="card">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">Seleziona struttura</label>
          <select value={strutturaId} onChange={e => setStrutturaId(e.target.value)}
            className="input w-auto">
            {strutture.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      )}

      {/* Info scenario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center py-5">
          <Monitor className="w-8 h-8 text-brand-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Ho già un sito</h3>
          <p className="text-xs text-gray-400 mt-1">Incolla il widget o il bottone nel tuo HTML</p>
        </div>
        <div className="card text-center py-5">
          <Smartphone className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Non ho un sito</h3>
          <p className="text-xs text-gray-400 mt-1">Usa il link diretto — condividilo su social, WhatsApp, email</p>
        </div>
        <div className="card text-center py-5">
          <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Voglio personalizzare</h3>
          <p className="text-xs text-gray-400 mt-1">Usa le nostre API per un'integrazione custom</p>
        </div>
      </div>

      {snippet && (
        <div className="space-y-4">
          {/* Link diretto */}
          <SnippetCard
            titolo="Link diretto alla prenotazione"
            descrizione="Condividi questo link via email, WhatsApp, social, QR code. Funziona subito."
            icona={<Link2 className="w-5 h-5 text-green-500" />}
            codice={snippet.snippets.urlPrenotazione}
            onCopy={() => copy(snippet.snippets.urlPrenotazione, 'link')}
            copied={copied === 'link'}
            lingua="url"
            extra={
              <div className="flex gap-2 mt-2">
                <a href={snippet.snippets.urlPrenotazione} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  Apri prenotazione <ExternalLink className="w-3 h-3" />
                </a>
                <a href={snippet.snippets.urlSpa} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                  Apri SPA <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            }
          />

          {/* Bottone popup */}
          <SnippetCard
            titolo="Bottone &quot;Prenota Ora&quot; fisso"
            descrizione="Un bottone che appare in basso a destra nel tuo sito. Cliccandolo si apre il form di prenotazione in popup."
            icona={<Globe className="w-5 h-5 text-brand-500" />}
            codice={snippet.snippets.bottoneFisso}
            onCopy={() => copy(snippet.snippets.bottoneFisso, 'bottone')}
            copied={copied === 'bottone'}
            lingua="html"
          />

          {/* Form inline */}
          <SnippetCard
            titolo="Form di prenotazione integrato"
            descrizione="Il form appare direttamente nella tua pagina, dentro un div. Ideale per la pagina 'Prenota' del tuo sito."
            icona={<Code className="w-5 h-5 text-amber-500" />}
            codice={snippet.snippets.formInline}
            onCopy={() => copy(snippet.snippets.formInline, 'inline')}
            copied={copied === 'inline'}
            lingua="html"
          />

          {/* Link HTML styled */}
          <SnippetCard
            titolo="Bottone HTML semplice"
            descrizione="Un link stilizzato da incollare dove vuoi. Non richiede JavaScript."
            icona={<Link2 className="w-5 h-5 text-gray-500" />}
            codice={snippet.snippets.linkDiretto}
            onCopy={() => copy(snippet.snippets.linkDiretto, 'htmllink')}
            copied={copied === 'htmllink'}
            lingua="html"
          />

          {/* iFrame */}
          <SnippetCard
            titolo="iFrame"
            descrizione="Incorpora la pagina di prenotazione completa. Per WordPress, Wix, Squarespace: incolla nell'editor HTML."
            icona={<Monitor className="w-5 h-5 text-indigo-500" />}
            codice={snippet.snippets.iframe}
            onCopy={() => copy(snippet.snippets.iframe, 'iframe')}
            copied={copied === 'iframe'}
            lingua="html"
          />

          {/* API */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">API per sviluppatori</h3>
            <p className="text-xs text-gray-500 mb-3">
              Documentazione completa con 110+ endpoint su <a href="/docs" target="_blank" className="text-brand-600 hover:underline">/docs</a> (Swagger UI).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function SnippetCard({ titolo, descrizione, icona, codice, onCopy, copied, lingua, extra }: {
  titolo: string; descrizione: string; icona: React.ReactNode; codice: string
  onCopy: () => void; copied: boolean; lingua: string; extra?: React.ReactNode
}) {
  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-3">
        {icona}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{titolo}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{descrizione}</p>
        </div>
        <button onClick={onCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            copied ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
          }`}>
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiato!' : 'Copia'}
        </button>
      </div>
      <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto font-mono">
        <code>{codice}</code>
      </pre>
      {extra}
    </div>
  )
}
