import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const signSchema = z.object({
  tipo: z.enum(['checkin', 'checkout', 'spa_waiver']),
  firmaBase64: z.string().min(1),
  accettazioneTermini: z.boolean().optional(),
  accettazionePrivacy: z.boolean().optional(),
})

/**
 * POST /api/kiosk/[token]/sign — salva firma dal tablet kiosk
 * Pubblico (no auth) — il token è il segreto
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req)
  const rl = rateLimit(`kiosk:${ip}`, { windowMs: 5 * 60 * 1000, max: 20 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppe richieste' }, { status: 429 })
  }

  const { token } = await params

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { checkInToken: token },
    select: { id: true, stato: true },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = signSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }

  const d = parsed.data

  switch (d.tipo) {
    case 'checkout':
      // Salva firma checkout sul campo regCard (riusiamo lo stesso campo)
      await prisma.prenotazione.update({
        where: { id: prenotazione.id },
        data: {
          regCardFirmata: true,
          regCardFirmaBase64: d.firmaBase64,
          regCardAccTermini: true,
          regCardAccPrivacy: true,
          regCardDataFirma: new Date(),
        },
      })
      break

    case 'checkin':
      await prisma.prenotazione.update({
        where: { id: prenotazione.id },
        data: {
          regCardFirmata: true,
          regCardFirmaBase64: d.firmaBase64,
          regCardAccTermini: d.accettazioneTermini ?? true,
          regCardAccPrivacy: d.accettazionePrivacy ?? true,
          regCardDataFirma: new Date(),
          checkInCompletato: true,
        },
      })
      break

    case 'spa_waiver':
      // Per SPA, salviamo sulla prenotazione come nota
      await prisma.prenotazione.update({
        where: { id: prenotazione.id },
        data: {
          regCardFirmata: true,
          regCardFirmaBase64: d.firmaBase64,
          regCardDataFirma: new Date(),
        },
      })
      break
  }

  return NextResponse.json({ ok: true, tipo: d.tipo })
}
