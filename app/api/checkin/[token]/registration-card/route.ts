import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const regCardSchema = z.object({
  accettazioneTermini: z.boolean(),
  accettazionePrivacy: z.boolean(),
  consensoMarketing: z.boolean().default(false),
  firmaBase64: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req)
  const rl = rateLimit(`regcard:${ip}`, { windowMs: 10 * 60 * 1000, max: 10 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppe richieste' }, { status: 429 })
  }

  const { token } = await params

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { checkInToken: token },
    select: { id: true, regCardFirmata: true },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  if (prenotazione.regCardFirmata) {
    return NextResponse.json({ error: 'Registration card già firmata' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = regCardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const d = parsed.data

  if (!d.accettazioneTermini || !d.accettazionePrivacy) {
    return NextResponse.json({ error: 'Termini e privacy obbligatori' }, { status: 400 })
  }

  await prisma.prenotazione.update({
    where: { id: prenotazione.id },
    data: {
      regCardFirmata: true,
      regCardFirmaBase64: d.firmaBase64,
      regCardAccTermini: d.accettazioneTermini,
      regCardAccPrivacy: d.accettazionePrivacy,
      regCardAccMarketing: d.consensoMarketing,
      regCardDataFirma: new Date(),
      checkInCompletato: true, // Check-in completato solo dopo firma
    },
  })

  return NextResponse.json({ ok: true })
}
