import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmailGeneric } from '@/lib/email'

const contactSchema = z.object({
  nome: z.string().min(1).max(200),
  email: z.string().email().max(254),
  messaggio: z.string().min(5).max(5000),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`contact:${ip}`, { windowMs: 10 * 60 * 1000, max: 3 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppe richieste. Riprova tra poco.' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }

  const { nome, email, messaggio } = parsed.data

  try {
    await sendEmailGeneric({
      to: 'info@otiumweek.it',
      subject: `[Contatto] Richiesta da ${nome} — Otium Week`,
      text: `Nuova richiesta di contatto:\n\nNome: ${nome}\nEmail: ${email}\n\nMessaggio:\n${messaggio}\n\n---\nInviato da: ${email}\nIP: ${ip}`,
    })
  } catch {
    // Silently fail — don't expose email errors
  }

  return NextResponse.json({ ok: true })
}
