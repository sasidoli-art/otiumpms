'use client'

import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

type Messaggio = {
  id: string
  mittente: 'HOST' | 'GUEST'
  testo: string
  letto: boolean
  createdAt: Date | string
}

export default function GuestChatBox({
  chatId,
  messaggiIniziali,
  hostNome,
}: {
  chatId: string
  messaggiIniziali: Messaggio[]
  hostNome: string
}) {
  const [messaggi, setMessaggi] = useState<Messaggio[]>(messaggiIniziali)
  const [testo, setTesto] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  // Polling ogni 6 secondi
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/book/chat/${chatId}`)
      if (res.ok) {
        const data = await res.json()
        setMessaggi(data.messaggi)
      }
    }, 6000)
    return () => clearInterval(interval)
  }, [chatId])

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    if (!testo.trim()) return
    setLoading(true)

    const res = await fetch(`/api/book/chat/${chatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testo }),
    })

    if (res.ok) {
      const msg = await res.json()
      setMessaggi((prev) => [...prev, msg])
      setTesto('')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[500px] p-5">
      {/* Lista messaggi */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messaggi.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">Inizia la conversazione…</p>
        )}
        {messaggi.map((m) => {
          const isGuest = m.mittente === 'GUEST'
          return (
            <div key={m.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
              <div>
                <p className={`text-xs mb-1 ${isGuest ? 'text-right text-gray-400' : 'text-gray-500'}`}>
                  {isGuest ? 'Tu' : hostNome}
                </p>
                <div
                  className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isGuest
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.testo}</p>
                  <p className={`text-xs mt-1 ${isGuest ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {format(new Date(m.createdAt), 'd MMM, HH:mm', { locale: it })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={invia} className="flex gap-2">
        <input
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Scrivi un messaggio..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !testo.trim()}
          className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
