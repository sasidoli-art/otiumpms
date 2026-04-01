/**
 * In-memory event bus for real-time chat.
 *
 * When a message is sent via API, it publishes to this bus.
 * SSE listeners subscribed to the same chatId receive it instantly.
 *
 * Limitations: works within a single process (fine for dev and single-instance deploys).
 * For multi-instance production, replace with Redis Pub/Sub.
 */

type ChatEvent = {
  type: 'message' | 'typing' | 'read' | 'presence'
  chatId: string
  data: unknown
}

type Listener = (event: ChatEvent) => void

class ChatEventBus {
  private listeners = new Map<string, Set<Listener>>()

  subscribe(chatId: string, listener: Listener): () => void {
    if (!this.listeners.has(chatId)) {
      this.listeners.set(chatId, new Set())
    }
    this.listeners.get(chatId)!.add(listener)

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(chatId)
      if (set) {
        set.delete(listener)
        if (set.size === 0) this.listeners.delete(chatId)
      }
    }
  }

  publish(event: ChatEvent) {
    const set = this.listeners.get(event.chatId)
    if (set) {
      for (const listener of set) {
        listener(event)
      }
    }
  }

  /** Get count of active listeners for a chat (for presence) */
  getListenerCount(chatId: string): number {
    return this.listeners.get(chatId)?.size ?? 0
  }
}

// Singleton — persists across hot reloads in dev
const globalForChat = globalThis as typeof globalThis & { chatEventBus?: ChatEventBus }
export const chatEventBus = globalForChat.chatEventBus ?? new ChatEventBus()
if (process.env.NODE_ENV !== 'production') globalForChat.chatEventBus = chatEventBus
