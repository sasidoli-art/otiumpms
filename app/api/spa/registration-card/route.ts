import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'

const spaRegCardSchema = z.object({
  appuntamentoId: z.string().min(1),
  incinta: z.boolean().default(false),
  incintaMesi: z.number().nullable().optional(),
  condizioni: z.array(z.string()).default([]),
  allergie: z.string().nullable().optional(),
  farmaci: z.string().nullable().optional(),
  patologieNote: z.string().nullable().optional(),
  zoneTrattate: z.array(z.string()).default([]),
  zoneEvitare: z.array(z.string()).default([]),
  pressionePreferita: z.string().optional(),
  accettazioneTermini: z.boolean(),
  accettazioneRischio: z.boolean(),
  accettazionePrivacy: z.boolean(),
  firmaBase64: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`spa-reg:${ip}`, { windowMs: 10 * 60 * 1000, max: 10 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppe richieste' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = spaRegCardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const d = parsed.data

  if (!d.accettazioneTermini || !d.accettazioneRischio || !d.accettazionePrivacy) {
    return NextResponse.json({ error: 'Tutte le accettazioni sono obbligatorie' }, { status: 400 })
  }

  // Verify appointment exists
  const appuntamento = await prisma.appuntamentoSpa.findUnique({
    where: { id: d.appuntamentoId },
    select: { id: true },
  })
  if (!appuntamento) {
    return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })
  }

  // Create waiver with registration card data
  const waiver = await prisma.waiverSpa.create({
    data: {
      appuntamentoId: d.appuntamentoId,
      firmaBase64: d.firmaBase64,
      zoneTrattate: d.zoneTrattate,
      zoneEvitare: d.zoneEvitare,
      incinta: d.incinta,
      incintaMesi: d.incintaMesi ?? null,
      allergie: d.allergie ?? null,
      patologie: d.condizioni.join(', '),
      farmaci: d.farmaci ?? null,
      accettazioneTermini: d.accettazioneTermini,
      accettazionePrivacy: d.accettazionePrivacy,
      pressioneMassaggio: d.pressionePreferita ?? null,
      notePreferenze: JSON.stringify({
        accettazioneRischio: d.accettazioneRischio,
        patologieNote: d.patologieNote,
        tipo: 'SPA_REGISTRATION_CARD',
      }),
      confermato: true,
    },
  })

  return NextResponse.json(waiver, { status: 201 })
}
