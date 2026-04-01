import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const signSchema = z.object({
  appuntamentoId: z.string().min(1),
  firmaBase64: z.string().min(1),
})

/**
 * POST /api/kiosk/spa/[cabinaId]/sign — firma waiver dal tablet cabina
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cabinaId: string }> }
) {
  const ip = getClientIp(req)
  const rl = rateLimit(`kiosk-spa:${ip}`, { windowMs: 5 * 60 * 1000, max: 20 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppe richieste' }, { status: 429 })
  }

  const { cabinaId } = await params

  const body = await req.json()
  const parsed = signSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }

  const { appuntamentoId, firmaBase64 } = parsed.data

  // Verifica appuntamento appartiene a questa cabina
  const appuntamento = await prisma.appuntamentoSpa.findFirst({
    where: { id: appuntamentoId, cabinaId },
    select: { id: true },
  })

  if (!appuntamento) {
    return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })
  }

  // Upsert waiver: se esiste aggiorna la firma, altrimenti crea uno base
  await prisma.waiverSpa.upsert({
    where: { appuntamentoId },
    update: {
      firmaBase64,
      confermato: true,
      accettazioneTermini: true,
      accettazionePrivacy: true,
    },
    create: {
      appuntamentoId,
      firmaBase64,
      confermato: true,
      accettazioneTermini: true,
      accettazionePrivacy: true,
    },
  })

  return NextResponse.json({ ok: true })
}
