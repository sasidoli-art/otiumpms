'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

const STORAGE_KEY = 'otium-public-concierge-history'

export function PublicConciergeWidget({
  strutturaId,
  strutturaNome,
  lingua = 'it',
}: {
  strutturaId: string
  strutturaNome: string
  lingua?: string
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Restore history per struttura
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}:${strutturaId}`)
      if (raw) setMessages(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [strutturaId])

  // Persist history
  useEffect(() => {
    if (messages.length === 0) return
    try {
      localStorage.setItem(`${STORAGE_KEY}:${strutturaId}`, JSON.stringify(messages))
    } catch {
      /* ignore */
    }
  }, [messages, strutturaId])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  const disclosure =
    lingua === 'en'
      ? `Hi! I'm the AI virtual assistant of ${strutturaNome}. I can help with info on rooms, services and availability. For existing bookings please contact the property directly.`
      : `Ciao! Sono l'assistente virtuale AI di ${strutturaNome}. Posso aiutarti con info su camere, servizi e disponibilità. Per info su prenotazioni esistenti contatta la struttura direttamente.`

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    const newHistory: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(newHistory)
    setLoading(true)

    try {
      const res = await fetch(`/api/book/${strutturaId}/concierge/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10), // invia max 10 messaggi pregressi
          lingua,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore')
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          aria-label="Apri assistente"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">
            {lingua === 'en' ? 'Ask assistant' : 'Chiedi all\'assistente'}
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[540px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{strutturaNome}</p>
                <p className="text-[10px] text-white/70 leading-tight">
                  {lingua === 'en' ? 'Virtual assistant · AI' : 'Assistente virtuale · AI'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20"
              aria-label="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 dark:bg-slate-950">
            {/* Disclosure sempre visibile come primo messaggio */}
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                {disclosure}
              </div>
            </div>

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2 text-xs flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                  <span className="text-gray-500">{lingua === 'en' ? 'Thinking...' : 'Sto pensando...'}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={send} className="flex gap-2 p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={lingua === 'en' ? 'Ask anything...' : 'Scrivi una domanda...'}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500 dark:text-slate-200"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white flex items-center justify-center transition-colors"
              aria-label="Invia"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
