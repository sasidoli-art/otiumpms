/**
 * GET  /api/host/webhooks      — lista subscription dell'host
 * POST /api/host/webhooks      — crea subscription, ritorna `secret` PLAIN una volta
 */
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { generateWebhookSecret, hashFingerprint } from '@/lib/webhooks'
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

const createSchema = z.object({
  url: z.string().url().refine((u) => u.startsWith('https://'), 'L\'URL deve essere HTTPS'),
  descrizione: z.string().max(200).optional().nullable(),
  eventi: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'Almeno un evento'),
})

export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const subs = await prisma.webhookSubscription.findMany({
    where: { hostId: auth.user.hostId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      url: true,
      descrizione: true,
      eventi: true,
      attivo: true,
      ultimaConsegnaAt: true,
      ultimaConsegnaOk: true,
      consegneRiuscite: true,
      consegneFallite: true,
      createdAt: true,
      secretHash: true,
    },
  })

  // Maschera l'hash → fingerprint visivo
  return NextResponse.json({
    webhooks: subs.map((s) => ({
      ...s,
      secretFingerprint: hashFingerprint(s.secretHash),
      secretHash: undefined,
    })),
  })
}

export async function POST(req: Request) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati non validi', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { plain, hash } = generateWebhookSecret()
  const sub = await prisma.webhookSubscription.create({
    data: {
      hostId: auth.user.hostId,
      url: parsed.data.url,
      descrizione: parsed.data.descrizione ?? null,
      eventi: parsed.data.eventi,
      secretHash: hash,
    },
  })

  await audit({
    hostId: auth.user.hostId,
    azione: 'webhook.create',
    entita: 'WebhookSubscription',
    entitaId: sub.id,
    datiJson: { url: sub.url, eventi: sub.eventi },
  })

  // ATTENZIONE: il `secret` viene mostrato UNA SOLA VOLTA
  return NextResponse.json({
    id: sub.id,
    url: sub.url,
    descrizione: sub.descrizione,
    eventi: sub.eventi,
    attivo: sub.attivo,
    secret: plain, // solo qui!
  }, { status: 201 })
}
