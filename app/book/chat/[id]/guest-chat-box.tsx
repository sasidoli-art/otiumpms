'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Send, Wifi, WifiOff } from 'lucide-react'
import { format } from 'date-fns'
import { it, enUS } from 'date-fns/locale'
import { useChat } from '@/lib/use-chat'

type Messaggio = {
  id: string
  mittente: 'HOST' | 'GUEST'
  testo: string
  letto: boolean
  createdAt: Date | string
}

const DATE_LOCALES: Record<string, typeof it> = { it, en: enUS }

export default function GuestChatBox({
  chatId,
  messaggiIniziali,
  hostNome,
}: {
  chatId: string
  messaggiIniziali: Messaggio[]
  hostNome: string
}) {
  const t = useTranslations('booking.chat')
  const locale = useLocale()
  const [testo, setTesto] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const {
    messages: messaggi,
    sendMessage,
    isTyping,
    peerOnline,
    setLocalTyping,
    connected,
  } = useChat({
    chatId,
    role: 'GUEST',
    fetchUrl: `/api/book/chat/${chatId}`,
    sendUrl: `/api/book/chat/${chatId}`,
    initialMessages: messaggiIniziali,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    if (!testo.trim()) return
    setLoading(true)
    setLocalTyping(false)

    const ok = await sendMessage(testo.trim())

    if (ok) setTesto('')
    setLoading(false)
  }

  function handleInputChange(val: string) {
    setTesto(val)
    setLocalTyping(val.length > 0)
  }

  return (
    <div className="flex flex-col h-[500px] p-5">
      {/* Connection status + host presence */}
      <div className="flex items-center gap-2 mb-3 px-1">
        {connected ? (
          <span className="flex items-center gap-1 text-[10px] text-green-500">
            <Wifi size={10} /> Live
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <WifiOff size={10} /> Polling
          </span>
        )}
        {peerOnline && (
          <span className="flex items-center gap-1 text-[10px] text-green-500 ml-auto">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {hostNome} online
          </span>
        )}
      </div>

      {/* Lista messaggi */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messaggi.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">{t('startConversation')}</p>
        )}
        {messaggi.map((m) => {
          const isGuest = m.mittente === 'GUEST'
          return (
            <div key={m.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
              <div>
                <p className={`text-xs mb-1 ${isGuest ? 'text-right text-gray-400' : 'text-gray-500'}`}>
                  {isGuest ? t('you') : hostNome}
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
                    {format(new Date(m.createdAt), 'd MMM, HH:mm', { locale: DATE_LOCALES[locale] ?? it })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start">
            <div>
              <p className="text-xs mb-1 text-gray-500">{hostNome}</p>
              <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={invia} className="flex gap-2">
        <input
          value={testo}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={() => setLocalTyping(false)}
          placeholder={t('messagePlaceholder')}
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
