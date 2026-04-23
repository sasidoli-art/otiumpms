import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

const UPSELLING_TOUCHPOINT = [
  'POST_PRENOTAZIONE', 'EMAIL_PRE_ARRIVO', 'CHECKIN_ONLINE',
  'BENVENUTO_WHATSAPP', 'IN_HOUSE',
] as const

const patchSchema = z.object({
  titolo: z.string().min(1).max(200).optional(),
  descrizione: z.string().max(2000).nullable().optional(),
  immagine: z.string().url().nullable().optional(),
  prezzo: z.number().nonnegative().nullable().optional(),
  prezzoPercentuale: z.number().min(0).max(100).nullable().optional(),
  trattamentoSpaId: z.string().nullable().optional(),
  servizioId: z.string().nullable().optional(),
  pacchettoId: z.string().nullable().optional(),
  unitaTargetId: z.string().nullable().optional(),
  posizione: z.array(z.enum(UPSELLING_TOUCHPOINT)).optional(),
  condizioni: z.record(z.unknown()).nullable().optional(),
  priorita: z.number().int().optional(),
  attivo: z.boolean().optional(),
})

/** PATCH /api/host/upselling/suggerimenti/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const existing = await prisma.upsellingSuggerimento.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  // Separiamo `condizioni` perché Prisma JSON accetta tipi speciali
  const { condizioni, ...rest } = parsed.data
  const data: Prisma.UpsellingSuggerimentoUpdateInput = { ...rest }
  if (condizioni !== undefined) {
    data.condizioni = condizioni === null ? Prisma.JsonNull : (condizioni as Prisma.InputJsonValue)
  }

  const updated = await prisma.upsellingSuggerimento.update({
    where: { id },
    data,
  })

  await auditFromAuth(auth, {
    azione: 'upselling.suggerimento_aggiornato',
    entita: 'UpsellingSuggerimento',
    entitaId: id,
    dettagli: `Aggiornati ${Object.keys(parsed.data).length} campi`,
  })

  return NextResponse.json(updated)
}

/** DELETE /api/host/upselling/suggerimenti/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const existing = await prisma.upsellingSuggerimento.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true, titolo: true },
  })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.upsellingSuggerimento.delete({ where: { id } })

  await auditFromAuth(auth, {
    azione: 'upselling.suggerimento_eliminato',
    entita: 'UpsellingSuggerimento',
    entitaId: id,
    dettagli: `Eliminato "${existing.titolo}" (con tutte le conversioni)`,
  })

  return NextResponse.json({ ok: true })
}
