/**
 * POST /api/host/abbonamento/portal
 *
 * Crea una Stripe Billing Portal session per l'host loggato e ritorna
 * `{ url }` dove redirezionare. La portal session è ephemeral (~1h) e
 * permette all'host di:
 *   - aggiornare carta di credito
 *   - scaricare ricevute/fatture Stripe
 *   - vedere storico pagamenti
 *   - cancellare il subscription (se policy attiva)
 *
 * Implementazione minimal senza dipendere da `stripe` npm package: si chiama
 * direttamente l'API REST `/v1/billing_portal/sessions` con form-encoded body.
 *
 * Pre-requisiti:
 *   - STRIPE_SECRET_KEY env var
 *   - Host.stripeCustomerId popolato (avviene al primo Stripe Checkout o
 *     manualmente da SuperAdmin se stiamo migrando un cliente esistente)
 *
 * Errors:
 *   - 503 se STRIPE_SECRET_KEY non configurato (Stripe non attivo in questa env)
 *   - 412 se l'host non ha ancora uno stripeCustomerId
 *   - 502 se Stripe API risponde con errore
 */
import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'

export const runtime = 'nodejs'

const STRIPE_API_URL = 'https://api.stripe.com/v1/billing_portal/sessions'

export async function POST(req: Request) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'Stripe non configurato in questa istanza. Contatta il supporto.' },
      { status: 503 },
    )
  }

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { id: true, stripeCustomerId: true },
  })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  if (!host.stripeCustomerId) {
    return NextResponse.json(
      { error: 'Nessun account Stripe collegato. Contatta il supporto per attivare la fatturazione.' },
      { status: 412 },
    )
  }

  const body = await req.json().catch(() => ({})) as { returnUrl?: string }
  const returnUrl =
    body.returnUrl ||
    `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/host/abbonamento`

  // Stripe REST: form-encoded
  const params = new URLSearchParams()
  params.set('customer', host.stripeCustomerId)
  params.set('return_url', returnUrl)

  let session: { url?: string; error?: { message?: string } }
  try {
    const res = await fetch(STRIPE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-06-20',
      },
      body: params.toString(),
    })
    session = await res.json()
    if (!res.ok || !session.url) {
      return NextResponse.json(
        { error: session.error?.message || 'Errore Stripe', status: res.status },
        { status: 502 },
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore connessione Stripe' },
      { status: 502 },
    )
  }

  await audit({
    hostId: auth.user.hostId,
    azione: 'abbonamento.portal_open',
    entita: 'Host',
    entitaId: auth.user.hostId,
  })

  return NextResponse.json({ url: session.url })
}
