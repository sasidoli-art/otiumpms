'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, MessageSquare, ArrowLeft, Send, Check, CheckCheck,
  ExternalLink, Zap, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChat } from '@/lib/use-chat'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Conversazione {
  id: string
  tipo: 'chat' | 'whatsapp'
  guestNome: string
  guestCognome: string
  unitaNome: string | null
  prenotazioneId: string | null
  stato?: string // ATTIVA, ESCALATA, CHIUSA (for WA)
  ultimoMessaggio: string | null
  ultimoMessaggioAt: string | null
  nonLetti: number
}

interface Messaggio {
  id: string
  mittente: 'HOST' | 'GUEST'
  testo: string
  letto: boolean
  createdAt: Date | string
}

// ─── Quick replies ──────────────────────────────────────────────────────────

const QUICK_REPLIES = [
  'La colazione è servita dalle 7:30 alle 10:00 in sala.',
  'Il check-out è entro le 11:00. Late check-out su richiesta.',
  'Grazie per averci contattato! Risponderemo al più presto.',
  'Può trovare tutte le informazioni nella directory in camera.',
  'Siamo a sua disposizione per qualsiasi esigenza.',
]

// ─── Time helpers ───────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const now = Date.now()
  const then = new Date(iso).getTime()
  const sec = Math.max(0, Math.floor((now - then) / 1000))
  if (sec < 60) return 'Ora'
  if (sec < 3600) return `${Math.floor(sec / 60)} min`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`
  const days = Math.floor(sec / 86400)
  if (days === 1) return 'Ieri'
  return `${days}g`
}

function formatTime(dateInput: Date | string): string {
  const d = new Date(dateInput)
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  conversazioniIniziali: Conversazione[]
  chatAperta?: string | null // pre-selected chat ID
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChatInboxHost({ conversazioniIniziali, chatAperta }: Props) {
  const [conversazioni, setConversazioni] = useState(conversazioniIniziali)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'tutti' | 'nonLetti' | 'whatsapp'>('tutti')
  const [activeChatId, setActiveChatId] = useState<string | null>(chatAperta ?? null)
  const [mobileShowChat, setMobileShowChat] = useState(!!chatAperta)
  const [loading, setLoading] = useState(false)

  // Refresh conversations periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/host/chat')
        if (res.ok) {
          const data = await res.json()
          if (data.conversazioni) setConversazioni(data.conversazioni)
        }
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Filter
  const filtered = useMemo(() => {
    let list = conversazioni
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.guestNome.toLowerCase().includes(q) ||
        c.guestCognome.toLowerCase().includes(q),
      )
    }
    if (filtro === 'nonLetti') list = list.filter(c => c.nonLetti > 0)
    if (filtro === 'whatsapp') list = list.filter(c => c.tipo === 'whatsapp')
    return list
  }, [conversazioni, search, filtro])

  const totalNonLetti = conversazioni.reduce((s, c) => s + c.nonLetti, 0)
  const activeConv = conversazioni.find(c => c.id === activeChatId)

  function openChat(id: string) {
    setActiveChatId(id)
    setMobileShowChat(true)
  }

  function closeChat() {
    setMobileShowChat(false)
  }

  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-[calc(100vh-56px)] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* ═══ Left panel: conversation list ═══ */}
      <div className={cn(
        'flex flex-col border-r border-slate-200 dark:border-slate-700 shrink-0',
        'w-full md:w-80 lg:w-[320px]',
        mobileShowChat ? 'hidden md:flex' : 'flex',
      )}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Messaggi</h2>
              {totalNonLetti > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalNonLetti > 99 ? '99+' : totalNonLetti}
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca ospite..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-300"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1">
            {(['tutti', 'nonLetti', 'whatsapp'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                  filtro === f
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                {f === 'tutti' ? 'Tutti' : f === 'nonLetti' ? 'Non letti' : 'WhatsApp'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageSquare className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
              <p className="text-sm text-slate-400">
                {search ? 'Nessun risultato' : 'Nessun messaggio'}
              </p>
              {!search && (
                <p className="text-xs text-slate-300 mt-1">Le conversazioni appariranno quando gli ospiti ti scriveranno.</p>
              )}
            </div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => openChat(conv.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 dark:border-slate-800',
                  activeChatId === conv.id
                    ? 'bg-blue-50 dark:bg-blue-950/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                )}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                  {conv.guestNome.charAt(0)}{conv.guestCognome.charAt(0)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={cn(
                        'text-sm truncate',
                        conv.nonLetti > 0 ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300',
                      )}>
                        {conv.guestNome} {conv.guestCognome}
                      </p>
                      {conv.tipo === 'whatsapp' && (
                        <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded font-bold shrink-0">WA</span>
                      )}
                      {conv.stato === 'ESCALATA' && (
                        <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded font-bold shrink-0">ESC</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {relativeTime(conv.ultimoMessaggioAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 truncate">
                      {conv.unitaNome && <span className="text-slate-300">{conv.unitaNome} · </span>}
                      {conv.ultimoMessaggio || 'Nessun messaggio'}
                    </p>
                    {conv.nonLetti > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.nonLetti}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ═══ Right panel: active chat ═══ */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0',
        mobileShowChat ? 'flex' : 'hidden md:flex',
      )}>
        {activeChatId && activeConv ? (
          <ChatPanel
            key={activeChatId}
            chatId={activeChatId}
            conv={activeConv}
            onBack={closeChat}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <MessageSquare className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
            <p className="text-sm font-medium text-slate-400">Seleziona una conversazione</p>
            <p className="text-xs text-slate-300 mt-1">Scegli un ospite dalla lista per iniziare</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Chat panel (right side) ────────────────────────────────────────────────

function ChatPanel({ chatId, conv, onBack }: {
  chatId: string
  conv: Conversazione
  onBack: () => void
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [initialMessages, setInitialMessages] = useState<Messaggio[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)

  // Load messages on mount
  useEffect(() => {
    setLoadingMessages(true)
    fetch(`/api/host/chat/${chatId}`)
      .then(r => r.ok ? r.json() : { messaggi: [] })
      .then(d => {
        setInitialMessages(d.messaggi ?? d.messages ?? [])
        setLoadingMessages(false)
      })
      .catch(() => setLoadingMessages(false))
  }, [chatId])

  const {
    messages,
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
    initialMessages,
    pollInterval: 5000,
  })

  // Auto-scroll
  const prevCount = useRef(messages.length)
  useEffect(() => {
    if (messages.length > prevCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevCount.current = messages.length
  }, [messages.length])

  useEffect(() => {
    if (!loadingMessages) messagesEndRef.current?.scrollIntoView()
  }, [loadingMessages])

  // Send
  async function handleSend() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    setLocalTyping(false)
    setText('')
    resetTextarea()
    await sendMessage(t)
    setSending(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

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

  function insertQuickReply(reply: string) {
    setText(reply)
    setShowQuickReplies(false)
    textareaRef.current?.focus()
  }

  return (
    <>
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="md:hidden p-1 -ml-1 rounded-lg hover:bg-slate-100 text-slate-400">
          <ArrowLeft size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
          {conv.guestNome.charAt(0)}{conv.guestCognome.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {conv.guestNome} {conv.guestCognome}
            </p>
            {conv.unitaNome && (
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{conv.unitaNome}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', peerOnline ? 'bg-emerald-500' : 'bg-slate-300')} />
            <span className="text-[10px] text-slate-400">
              {peerOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        {conv.prenotazioneId && (
          <Link
            href={`/host/prenotazioni/${conv.prenotazioneId}`}
            className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
          >
            Prenotazione <ExternalLink size={10} />
          </Link>
        )}
      </div>

      {/* Escalation banner */}
      {conv.stato === 'ESCALATA' && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          Conversazione presa in carico dal concierge AI. Stai rispondendo come operatore.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-sm text-slate-400">Nessun messaggio in questa conversazione</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => {
              const isHost = msg.mittente === 'HOST'
              const prev = i > 0 ? messages[i - 1] : null
              const grouped = prev && prev.mittente === msg.mittente &&
                (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 120000

              return (
                <div key={msg.id} className={cn('flex', isHost ? 'justify-end' : 'justify-start', grouped ? 'mt-0.5' : 'mt-2')}>
                  <div className="max-w-[75%]">
                    <div className={cn(
                      'px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap',
                      isHost
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm',
                    )}>
                      {msg.testo}
                    </div>
                    <div className={cn('flex items-center gap-1 mt-0.5 px-1', isHost ? 'justify-end' : '')}>
                      <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
                      {isHost && (
                        msg.letto
                          ? <CheckCheck size={12} className="text-blue-400" />
                          : <Check size={12} className="text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex mt-1">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm">
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

      {/* Input */}
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 px-3 py-2">
        {/* Quick replies dropdown */}
        <div className="relative">
          {showQuickReplies && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto z-10">
              {QUICK_REPLIES.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => insertQuickReply(reply)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowQuickReplies(v => !v)}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors',
              showQuickReplies
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400',
            )}
            title="Risposte rapide"
          >
            <Zap size={16} />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => setLocalTyping(false)}
            placeholder="Scrivi un messaggio..."
            rows={1}
            className="flex-1 resize-none border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-300"
            style={{ maxHeight: 120 }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all',
              text.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed',
            )}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
