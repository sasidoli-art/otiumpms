'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Mail, MessageSquare, Phone, MessageCircle, CheckCheck, Wifi, WifiOff } from 'lucide-react'
import { format } from 'date-fns'
import { it, enUS } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import { useChat } from '@/lib/use-chat'

type CanaleMessaggio = 'CHAT' | 'EMAIL' | 'WHATSAPP' | 'SMS'

const CANALI: { value: CanaleMessaggio; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'CHAT', label: 'Chat', icon: <MessageSquare size={13} />, color: 'text-blue-500' },
  { value: 'EMAIL', label: 'Email', icon: <Mail size={13} />, color: 'text-purple-500' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: <MessageCircle size={13} />, color: 'text-green-500' },
  { value: 'SMS', label: 'SMS', icon: <Phone size={13} />, color: 'text-orange-500' },
]

const DATE_LOCALES: Record<string, typeof it> = { it, en: enUS }

function CanaleBadge({ canale }: { canale?: string }) {
  const c = CANALI.find((x) => x.value === (canale ?? 'CHAT')) ?? CANALI[0]
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${c.color} opacity-75`}>
      {c.icon}
      {c.label}
    </span>
  )
}

export default function ChatBox({
  chatId,
  messaggiIniziali,
}: {
  chatId: string
  messaggiIniziali: { id: string; mittente: 'HOST' | 'GUEST'; canale?: string; testo: string; letto: boolean; createdAt: Date | string }[]
}) {
  const locale = useLocale()
  const [testo, setTesto] = useState('')
  const [canale, setCanale] = useState<CanaleMessaggio>('CHAT')
  const [loading, setLoading] = useState(false)
  const [confermato, setConfermato] = useState<string | null>(null)
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
    role: 'HOST',
    fetchUrl: `/api/host/chat/${chatId}`,
    sendUrl: `/api/host/chat/${chatId}`,
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

    const ok = await sendMessage(testo.trim(), canale)

    if (ok) {
      setTesto('')
      if (canale === 'EMAIL') {
        setConfermato('📧 Email inviata all\'ospite')
        setTimeout(() => setConfermato(null), 3000)
      }
    }
    setLoading(false)
  }

  function handleInputChange(val: string) {
    setTesto(val)
    setLocalTyping(val.length > 0)
  }

  return (
    <div className="flex flex-col h-[440px]">
      {/* Connection status + peer presence */}
      <div className="flex items-center gap-2 mb-2 px-1">
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
            Ospite online
          </span>
        )}
      </div>

      {/* Lista messaggi */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        {messaggi.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            Nessun messaggio — inizia la conversazione con l&apos;ospite
          </p>
        )}
        {messaggi.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.mittente === 'HOST' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.mittente === 'HOST'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.testo}</p>
              <div className={`flex items-center gap-1.5 mt-1 ${m.mittente === 'HOST' ? 'justify-end' : 'justify-start'}`}>
                <span className={`text-xs ${m.mittente === 'HOST' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {format(new Date(m.createdAt), 'd MMM, HH:mm', { locale: DATE_LOCALES[locale] ?? it })}
                </span>
                {m.mittente === 'HOST' && m.canale && m.canale !== 'CHAT' && (
                  <span className="text-indigo-200 opacity-80">
                    <CanaleBadge canale={m.canale} />
                  </span>
                )}
                {m.mittente === 'HOST' && m.letto && (
                  <CheckCheck size={12} className="text-indigo-200" />
                )}
              </div>
            </div>
            {m.mittente === 'GUEST' && m.canale && m.canale !== 'CHAT' && (
              <div className="mt-0.5 px-1">
                <CanaleBadge canale={m.canale} />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start">
            <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Feedback invio */}
      {confermato && (
        <div className="text-xs text-green-600 text-center mb-2 font-medium">{confermato}</div>
      )}

      {/* Input + selettore canale */}
      <form onSubmit={invia} className="space-y-2">
        <div className="flex gap-1">
          {CANALI.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCanale(c.value)}
              title={c.value === 'WHATSAPP' || c.value === 'SMS' ? `${c.label} (non ancora configurato)` : c.label}
              disabled={c.value === 'WHATSAPP' || c.value === 'SMS'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all
                ${canale === c.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'}
                disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
          {canale === 'EMAIL' && (
            <span className="ml-auto text-[10px] text-purple-500 self-center">
              📧 Inviato anche via email
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={testo}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={() => setLocalTyping(false)}
            placeholder={canale === 'EMAIL' ? 'Scrivi email all\'ospite...' : 'Scrivi un messaggio...'}
            className="input flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !testo.trim()}
            className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
