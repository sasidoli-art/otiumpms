import { NextResponse } from 'next/server'
import { chatEventBus } from '@/lib/chat-events'

/** POST /api/chat/[chatId]/typing — notify typing status */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params
  const { role, isTyping } = await req.json()

  if (!['HOST', 'GUEST'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  chatEventBus.publish({
    type: 'typing',
    chatId,
    data: { role, isTyping: !!isTyping },
  })

  return NextResponse.json({ ok: true })
}
