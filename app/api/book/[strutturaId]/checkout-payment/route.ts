import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createOnlineCheckout } from '@/lib/payment-provider'
import { logger } from '@/lib/logger'
import { audit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'

const bodySchema = z.object({
  prenotazioneId: z.string().min(1),
})

// POST /api/book/[strutturaId]/checkout-payment
// Crea una Stripe Checkout Session e ritorna l'URL a cui redirigere l'ospite.
// L'ospite completa il pagamento sulla hosted page Stripe; il webhook
// /api/webhooks/stripe aggiorna stato PagamentoCheckout e conferma la prenotazione.
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ strutturaId: string }> },
) {
  const { strutturaId } = await paramsPromise

  const raw = await req.json()
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  const { prenotazioneId } = parsed.data

  const prenotazione = await prisma.prenotazione.findFirst({
    where: {
      id: prenotazioneId,
      strutturaId,
      deletedAt: null,
    },
    include: {
      host: {
        select: {
          id: true,
          paymentConfig: {
            select: { providerAttivo: true, stripeSecretKey: true },
          },
        },
      },
      struttura: { select: { nome: true } },
    },
  })
  if (!prenotazione) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })

  const importo = prenotazione.prezzoTotale ?? 0
  if (importo <= 0) {
    return NextResponse.json({ error: 'Importo non valido' }, { status: 400 })
  }

  const config = prenotazione.host.paymentConfig
  if (!config || config.providerAttivo !== 'STRIPE' || !config.stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe non configurato per questa struttura' },
      { status: 400 },
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const result = await createOnlineCheckout(config.stripeSecretKey, {
    hostId: prenotazione.hostId,
    prenotazioneId: prenotazione.id,
    importo,
    descrizione: `Prenotazione ${prenotazione.struttura?.nome ?? ''} — ${prenotazione.guestCognome} ${prenotazione.guestNome}`,
    successUrl: `${baseUrl}/book/${strutturaId}/conferma?pid=${prenotazione.id}&payment=success`,
    cancelUrl: `${baseUrl}/book/${strutturaId}/conferma?pid=${prenotazione.id}&payment=cancel`,
    guestEmail: prenotazione.guestEmail,
    captureMode: 'automatic',
    metadata: { strutturaId, tipo: 'booking' },
  })

  if (!result.success || !result.sessionUrl) {
    logger.error('Stripe checkout creation failed', 'book/checkout-payment', {
      prenotazioneId, error: result.errore,
    })
    return NextResponse.json({ error: result.errore ?? 'Errore creazione pagamento' }, { status: 502 })
  }

  // Crea record PagamentoCheckout in stato PENDENTE
  const pagamento = await prisma.pagamentoCheckout.create({
    data: {
      hostId: prenotazione.hostId,
      prenotazioneId: prenotazione.id,
      importo,
      divisa: 'EUR',
      metodo: 'CARTA',
      provider: 'STRIPE',
      riferimentoEsterno: result.sessionId,
      stato: 'PENDENTE',
      note: 'Checkout session Stripe in attesa',
    },
  })

  // GDPR Art. 30 — traccia creazione sessione pagamento online
  await audit({
    hostId: prenotazione.hostId,
    userId: null,
    userEmail: prenotazione.guestEmail,
    azione: 'pagamento_checkout.online.avviato',
    entita: 'pagamentoCheckout',
    entitaId: pagamento.id,
    dettagli: `Stripe Checkout €${importo} prenotazione=${prenotazione.id}`,
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({
    ok: true,
    sessionId: result.sessionId,
    url: result.sessionUrl,
  })
}
