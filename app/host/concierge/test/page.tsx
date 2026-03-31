'use client'

import { useState } from 'react'
import { Bot, Send, Loader2, User, Sparkles, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type Msg = { role: 'user' | 'ai'; text: string; tools?: string[]; tokens?: number | null }

export default function ConciergeTestPage() {
  const [telefono, setTelefono] = useState('+393331234567')
  const [nome, setNome] = useState('Test Ospite')
  const [input, setInput] = useState('')
  const [messaggi, setMessaggi] = useState<Msg[]>([])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

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

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-500" /> Simulatore AI Concierge</h1>
          <p className="text-xs text-gray-500">Testa il concierge senza WhatsApp. Simula una conversazione ospite.</p>
        </div>
        <Link href="/host/concierge" className="btn-secondary text-xs">Dashboard</Link>
      </div>

      {/* Config simulazione */}
      <div className="card flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] text-gray-500">Telefono simulato</label>
          <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className={inp + ' w-full'} />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-gray-500">Nome ospite</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)} className={inp + ' w-full'} />
        </div>
      </div>

      {errore && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {errore}
        </div>
      )}

      {/* Chat */}
      <div className="card min-h-[400px] max-h-[60vh] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
        {messaggi.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Bot className="w-16 h-16 opacity-30 mb-3" />
            <p className="text-sm">Scrivi un messaggio per iniziare</p>
            <p className="text-xs text-gray-400 mt-1">Prova: "A che ora è la colazione?", "Vorrei prenotare un massaggio", "Ho bisogno di asciugamani extra"</p>
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
              {m.tokens && <p className="text-[9px] text-gray-400 mt-1">{m.tokens} tokens</p>}
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

      {/* Input */}
      <form onSubmit={invia} className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} disabled={loading}
          placeholder="Scrivi un messaggio..."
          className={`flex-1 ${inp} py-3`}
          autoFocus />
        <button type="submit" disabled={loading || !input.trim()}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
