'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Messaggio = {
  id: string
  mittente: 'HOST' | 'GUEST'
  canale?: string
  testo: string
  letto: boolean
  createdAt: Date | string
}

type ChatEvent = {
  type: 'connected' | 'message' | 'typing' | 'read' | 'presence'
  chatId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

interface UseChatOptions {
  chatId: string
  role: 'HOST' | 'GUEST'
  /** API URL for fetching messages */
  fetchUrl: string
  /** API URL for sending messages */
  sendUrl: string
  /** Initial messages from SSR */
  initialMessages: Messaggio[]
  /** Polling interval in ms (fallback if SSE fails) */
  pollInterval?: number
}

interface UseChatReturn {
  messages: Messaggio[]
  sendMessage: (testo: string, canale?: string) => Promise<boolean>
  isTyping: boolean
  peerOnline: boolean
  setLocalTyping: (typing: boolean) => void
  connected: boolean
}

export function useChat({
  chatId,
  role,
  fetchUrl,
  sendUrl,
  initialMessages,
  pollInterval = 15000,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Messaggio[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const [peerOnline, setPeerOnline] = useState(false)
  const [connected, setConnected] = useState(false)
  const [useSSE, setUseSSE] = useState(true)
  const eventSourceRef = useRef<EventSource | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout>>()
  const lastTypingSent = useRef(0)

  // SSE connection
  useEffect(() => {
    if (!useSSE) return

    const es = new EventSource(`/api/chat/${chatId}/stream?role=${role}`)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)

    es.onmessage = (event) => {
      try {
        const evt: ChatEvent = JSON.parse(event.data)

        switch (evt.type) {
          case 'connected':
            setConnected(true)
            break

          case 'message': {
            const msg = evt.data as Messaggio
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            // Clear typing when message received from peer
            if (msg.mittente !== role) setIsTyping(false)
            break
          }

          case 'typing': {
            const { role: typingRole, isTyping: typing } = evt.data
            if (typingRole !== role) {
              setIsTyping(typing)
              // Auto-clear typing after 5s
              clearTimeout(typingTimeoutRef.current)
              if (typing) {
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 5000)
              }
            }
            break
          }

          case 'read': {
            const { by } = evt.data
            // If peer read our messages, update letto status
            if (by !== role) {
              setMessages(prev =>
                prev.map(m =>
                  m.mittente === role && !m.letto ? { ...m, letto: true } : m
                )
              )
            }
            break
          }

          case 'presence': {
            const { role: presenceRole, status } = evt.data
            if (presenceRole !== role) {
              setPeerOnline(status === 'online')
            }
            break
          }
        }
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    }

    es.onerror = () => {
      setConnected(false)
      // Fallback to polling after SSE failure
      es.close()
      setUseSSE(false)
    }

    return () => {
      es.close()
      eventSourceRef.current = null
      setConnected(false)
    }
  }, [chatId, role, useSSE])

  // Fallback polling when SSE is not available
  useEffect(() => {
    if (useSSE && connected) return // SSE is working, no need for polling

    const interval = setInterval(async () => {
      try {
        const res = await fetch(fetchUrl)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messaggi ?? data.messages ?? [])
        }
      } catch {
        // Silently ignore polling errors
      }
    }, pollInterval)

    return () => clearInterval(interval)
  }, [useSSE, connected, fetchUrl, pollInterval])

  // Send message
  const sendMessage = useCallback(async (testo: string, canale?: string): Promise<boolean> => {
    try {
      const body: Record<string, string> = { testo }
      if (canale) body.canale = canale

      const res = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const msg = await res.json()
        // Add optimistically (SSE will also deliver it, dedup handles it)
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        return true
      }
    } catch {
      // Network error
    }
    return false
  }, [sendUrl])

  // Send typing indicator (debounced)
  const setLocalTyping = useCallback((typing: boolean) => {
    const now = Date.now()
    // Throttle: max 1 typing event per 2 seconds
    if (typing && now - lastTypingSent.current < 2000) return
    lastTypingSent.current = now

    clearTimeout(typingDebounceRef.current)

    // Send immediately for "start typing", debounce for "stop typing"
    if (typing) {
      fetch(`/api/chat/${chatId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, isTyping: true }),
      }).catch(() => {})
    } else {
      typingDebounceRef.current = setTimeout(() => {
        fetch(`/api/chat/${chatId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, isTyping: false }),
        }).catch(() => {})
      }, 300)
    }
  }, [chatId, role])

  return {
    messages,
    sendMessage,
    isTyping,
    peerOnline,
    setLocalTyping,
    connected,
  }
}
