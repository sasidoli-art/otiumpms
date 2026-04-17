'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, ArrowLeft, Check, CheckCheck, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChat } from '@/lib/use-chat'

// ─── Types ──────────────────────────────────────────────────────────────────

type Messaggio = {
  id: string
  mittente: 'HOST' | 'GUEST'
  testo: string
  letto: boolean
  createdAt: Date | string
}

interface Props {
  chatId: string
  messaggiIniziali: Messaggio[]
  hostNome: string
  strutturaNome?: string
  logo?: string | null
  colorePrimario?: string | null
  backHref?: string | null
}

// ─── Quick suggestions ──────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  'Orari check-in',
  'Come raggiungervi',
  'Richiesta speciale',
  'Informazioni SPA',
]

// ─── Time formatting ────────────────────────────────────────────────────────

function formatMessageTime(dateInput: Date | string): string {
  const d = new Date(dateInput)
  const now = new Date()
  const hhmm = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return hhmm

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Ieri ${hhmm}`

  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} ${hhmm}`
}

function dateSeparator(dateInput: Date | string): string {
  const d = new Date(dateInput)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Oggi'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Ieri'
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function shouldShowDateSep(current: Messaggio, prev: Messaggio | null): boolean {
  if (!prev) return true
  const a = new Date(current.createdAt).toDateString()
  const b = new Date(prev.createdAt).toDateString()
  return a !== b
}

function isGrouped(current: Messaggio, prev: Messaggio | null): boolean {
  if (!prev) return false
  if (current.mittente !== prev.mittente) return false
  const diff = new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime()
  return diff < 120_000 // 2 minutes
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChatGuest({
  chatId, messaggiIniziali, hostNome, strutturaNome,
  logo, colorePrimario, backHref,
}: Props) {
  const accent = colorePrimario || '#4f46e5'
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [reconnecting, setReconnecting] = useState(false)

  const {
    messages,
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
    pollInterval: 5000,
  })

  // ── Auto-scroll on new messages ──
  const prevCountRef = useRef(messages.length)
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevCountRef.current = messages.length
  }, [messages.length])

  // Scroll to bottom on mount
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView()
  }, [])

  // ── Mark host messages as read ──
  useEffect(() => {
    if (!connected) return
    const unread = messages.filter(m => m.mittente === 'HOST' && !m.letto)
    if (unread.length > 0) {
      fetch(`/api/chat/${chatId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'GUEST' }),
      }).catch(() => {})
    }
  }, [messages, connected, chatId])

  // ── Connection lost indicator ──
  useEffect(() => {
    if (!connected) {
      const timer = setTimeout(() => setReconnecting(true), 3000)
      return () => clearTimeout(timer)
    }
    setReconnecting(false)
  }, [connected])

  // ── Send message ──
  const handleSend = useCallback(async () => {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    setLocalTyping(false)
    setText('')
    resetTextarea()

    await sendMessage(t)
    setSending(false)
  }, [text, sending, sendMessage, setLocalTyping])

  // ── Quick suggestion ──
  const handleQuickSuggestion = useCallback(async (suggestion: string) => {
    setText('')
    setSending(true)
    await sendMessage(suggestion)
    setSending(false)
  }, [sendMessage])

  // ── Keyboard ──
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Textarea auto-resize ──
  function handleInput(val: string) {
    setText(val)
    setLocalTyping(val.length > 0)
    autoResize()
  }

  function autoResize() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  function resetTextarea() {
    const ta = textareaRef.current
    if (ta) ta.style.height = 'auto'
  }

  // ── Grouped messages ──
  const groupedMessages = useMemo(() => {
    return messages.map((msg, i) => ({
      msg,
      showDate: shouldShowDateSep(msg, i > 0 ? messages[i - 1] : null),
      grouped: isGrouped(msg, i > 0 ? messages[i - 1] : null),
    }))
  }, [messages])

  const isEmpty = messages.length === 0

  const initials = hostNome.charAt(0).toUpperCase()

  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* ═══ Header ═══ */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
        {backHref && (
          <a href={backHref} className="p-1 -ml-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <ArrowLeft size={20} />
          </a>
        )}
        {logo ? (
          <img src={logo} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: accent }}>
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{hostNome}</p>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'w-2 h-2 rounded-full shrink-0',
              peerOnline ? 'bg-emerald-500' : 'bg-slate-300',
            )} />
            <p className="text-xs text-slate-500">
              {peerOnline ? 'Online' : 'Risponderemo al più presto'}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Reconnecting banner ═══ */}
      {reconnecting && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-700">
          <WifiOff size={12} /> Connessione persa, riconnessione...
        </div>
      )}

      {/* ═══ Messages area ═══ */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {logo ? (
              <img src={logo} alt="" className="w-16 h-16 rounded-2xl object-cover mb-4 opacity-80" />
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-4 opacity-80"
                style={{ backgroundColor: accent }}>
                {initials}
              </div>
            )}
            <p className="text-base font-semibold text-slate-800 mb-1">Come possiamo aiutarti?</p>
            <p className="text-xs text-slate-400 mb-5">
              {strutturaNome ? `Scrivi a ${strutturaNome}` : 'Invia un messaggio per iniziare'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleQuickSuggestion(s)}
                  disabled={sending}
                  className="px-3 py-2 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="space-y-0.5">
            {groupedMessages.map(({ msg, showDate, grouped }) => (
              <div key={msg.id}>
                {/* Date separator */}
                {showDate && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] font-semibold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                      {dateSeparator(msg.createdAt)}
                    </span>
                  </div>
                )}

                {/* Message bubble */}
                <MessageBubble
                  msg={msg}
                  accent={accent}
                  grouped={grouped}
                  hostInitials={initials}
                />
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2 mt-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: accent }}>
                  {initials}
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ═══ Input ═══ */}
      <div className="shrink-0 bg-white border-t border-slate-200 px-3 py-2 safe-area-bottom">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => setLocalTyping(false)}
            placeholder="Scrivi un messaggio..."
            rows={1}
            className="flex-1 resize-none border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-300 transition-colors bg-slate-50"
            style={{ maxHeight: 120 }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all',
              text.trim()
                ? 'text-white shadow-md hover:shadow-lg active:scale-95'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed',
            )}
            style={text.trim() ? { backgroundColor: accent } : undefined}
          >
            <Send size={16} className={text.trim() ? '' : ''} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({ msg, accent, grouped, hostInitials }: {
  msg: Messaggio
  accent: string
  grouped: boolean
  hostInitials: string
}) {
  const isGuest = msg.mittente === 'GUEST'
  const time = formatMessageTime(msg.createdAt)

  if (isGuest) {
    return (
      <div className={cn('flex justify-end', grouped ? 'mt-0.5' : 'mt-2')}>
        <div className="max-w-[80%] sm:max-w-[70%]">
          <div className="px-3.5 py-2 rounded-2xl rounded-br-sm text-sm text-white whitespace-pre-wrap"
            style={{ backgroundColor: accent }}>
            {msg.testo}
          </div>
          <div className="flex items-center justify-end gap-1 mt-0.5 px-1">
            <span className="text-[10px] text-slate-400">{time}</span>
            {msg.letto ? (
              <CheckCheck size={12} className="text-blue-500" />
            ) : (
              <Check size={12} className="text-slate-300" />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-end gap-2', grouped ? 'mt-0.5' : 'mt-2')}>
      {!grouped ? (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
          style={{ backgroundColor: accent }}>
          {hostInitials}
        </div>
      ) : (
        <div className="w-7 shrink-0" />
      )}
      <div className="max-w-[80%] sm:max-w-[70%]">
        <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-2xl rounded-bl-sm text-sm text-slate-800 whitespace-pre-wrap">
          {msg.testo}
        </div>
        {!grouped && (
          <span className="text-[10px] text-slate-400 mt-0.5 px-1 block">{time}</span>
        )}
      </div>
    </div>
  )
}
