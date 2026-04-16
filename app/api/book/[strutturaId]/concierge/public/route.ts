import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { processPublicMessage, type PublicChatMessage } from '@/lib/public-concierge'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const bodySchema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  lingua: z.string().max(5).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ strutturaId: string }> },
) {
  const { strutturaId } = await params

  // Rate limit per IP: 10 messaggi ogni 10 min (budget tokens pubblico)
  const ip = getClientIp(req)
  const rl = rateLimit(`public-concierge:${ip}`, { windowMs: 10 * 60 * 1000, max: 10 })
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: 'Troppe richieste. Riprova tra qualche minuto o contatta direttamente la struttura.',
        retryAfter: rl.retryAfter,
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  let payload
  try {
    payload = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })
  }

  try {
    const result = await processPublicMessage({
      strutturaId,
      history: payload.history as PublicChatMessage[],
      newMessage: payload.message,
      lingua: payload.lingua,
    })
    return NextResponse.json(result)
  } catch (err) {
    logger.error('[public-concierge-route] failed', { err: String(err) })
    return NextResponse.json(
      { error: 'Errore interno del servizio AI' },
      { status: 500 },
    )
  }
}
