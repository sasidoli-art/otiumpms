import { chatEventBus } from '@/lib/chat-events'

/**
 * SSE endpoint for real-time chat updates.
 *
 * GET /api/chat/[chatId]/stream
 *
 * No auth required (same security model as guest chat — chatId is the secret).
 * The client passes ?role=HOST|GUEST to enable presence tracking.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params
  const url = new URL(req.url)
  const role = url.searchParams.get('role') ?? 'GUEST'

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', chatId })}\n\n`))

      // Publish presence
      chatEventBus.publish({
        type: 'presence',
        chatId,
        data: { role, status: 'online' },
      })

      // Subscribe to chat events
      unsubscribe = chatEventBus.subscribe(chatId, (event) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // Client disconnected
          closed = true
        }
      })

      // Heartbeat every 25s to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat)
          return
        }
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          closed = true
          clearInterval(heartbeat)
        }
      }, 25000)

      // Cleanup on abort
      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(heartbeat)
        if (unsubscribe) unsubscribe()

        // Publish offline presence
        chatEventBus.publish({
          type: 'presence',
          chatId,
          data: { role, status: 'offline' },
        })

        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      closed = true
      if (unsubscribe) unsubscribe()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
