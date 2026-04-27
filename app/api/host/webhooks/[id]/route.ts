/**
 * PATCH  /api/host/webhooks/[id]    — toggle attivo / aggiorna eventi/descrizione
 * DELETE /api/host/webhooks/[id]    — rimuove subscription (cascade su consegne)
 */
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'

const WEBHOOK_EVENTS = [
  'PRENOTAZIONE_CREATA',
  'PRENOTAZIONE_AGGIORNATA',
  'PRENOTAZIONE_CANCELLATA',
  'CHECKIN_COMPLETATO',
  'CHECKOUT_COMPLETATO',
  'PAGAMENTO_RICEVUTO',
  'SPA_APPUNTAMENTO_CREATO',
  'SPA_APPUNTAMENTO_AGGIORNATO',
  'RECENSIONE_RICEVUTA',
] as const

const patchSchema = z.object({
  attivo: z.boolean().optional(),
  descrizione: z.string().max(200).nullable().optional(),
  eventi: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
}).refine(
  (d) => d.attivo !== undefined || d.descrizione !== undefined || d.eventi !== undefined,
  { message: 'Nessun campo da aggiornare' },
)

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const sub = await prisma.webhookSubscription.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!sub) return NextResponse.json({ error: 'Webhook non trovato' }, { status: 404 })

  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati non validi', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const updated = await prisma.webhookSubscription.update({
    where: { id },
    data: {
      ...(parsed.data.attivo !== undefined && { attivo: parsed.data.attivo }),
      ...(parsed.data.descrizione !== undefined && { descrizione: parsed.data.descrizione }),
      ...(parsed.data.eventi !== undefined && { eventi: parsed.data.eventi }),
    },
  })

  await audit({
    hostId: auth.user.hostId,
    azione: 'webhook.update',
    entita: 'WebhookSubscription',
    entitaId: id,
    datiJson: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json({
    id: updated.id,
    attivo: updated.attivo,
    descrizione: updated.descrizione,
    eventi: updated.eventi,
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const sub = await prisma.webhookSubscription.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true, url: true },
  })
  if (!sub) return NextResponse.json({ error: 'Webhook non trovato' }, { status: 404 })

  await prisma.webhookSubscription.delete({ where: { id } })

  await audit({
    hostId: auth.user.hostId,
    azione: 'webhook.delete',
    entita: 'WebhookSubscription',
    entitaId: id,
    datiJson: { url: sub.url },
  })

  return NextResponse.json({ ok: true })
}
