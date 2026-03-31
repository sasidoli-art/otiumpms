import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { createPaymentProvider } from '@/lib/payment-provider'
import { audit } from '@/lib/audit'

/**
 * POST /api/host/pagamento-checkout
 * Processa un pagamento al checkout.
 * Body: {
 *   prenotazioneId, importo, metodo: "CARTA"|"CONTANTI"|"BONIFICO"|"ALTRO",
 *   ultime4Cifre?, circuito?, autorizzazione?, note?,
 *   usaProvider?: boolean (se true, invia al POS)
 * }
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { prenotazioneId, importo, metodo, ultime4Cifre, circuito, autorizzazione, note, usaProvider } = body

  if (!prenotazioneId || !importo || !metodo) {
    return NextResponse.json({ error: 'prenotazioneId, importo e metodo obbligatori' }, { status: 400 })
  }

  const pren = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId: auth.user.hostId },
    select: { id: true, guestNome: true, guestCognome: true, hostId: true },
  })
  if (!pren) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })

  let riferimentoEsterno: string | null = null
  let provider = 'MANUALE'
  let stato = 'COMPLETATO'
  let errore: string | null = null

  // Se richiesto, usa il provider POS configurato
  if (usaProvider && metodo === 'CARTA') {
    const config = await prisma.paymentProviderConfig.findUnique({
      where: { hostId: auth.user.hostId },
    })

    if (config && config.providerAttivo !== 'MANUALE') {
      const pp = createPaymentProvider(config)
      const result = await pp.processPayment({
        importo,
        riferimento: prenotazioneId,
        descrizione: `Checkout ${pren.guestCognome} ${pren.guestNome}`,
      })

      riferimentoEsterno = result.transactionId
      provider = config.providerAttivo
      stato = result.success ? 'COMPLETATO' : 'RIFIUTATO'
      errore = result.errore

      if (!result.success) {
        return NextResponse.json({
          error: result.errore || 'Pagamento rifiutato dal terminale',
          stato: 'RIFIUTATO',
          provider,
        }, { status: 402 })
      }
    }
  }

  // Registra transazione
  const pagamento = await prisma.pagamentoCheckout.create({
    data: {
      hostId: auth.user.hostId,
      prenotazioneId,
      importo,
      metodo,
      provider,
      riferimentoEsterno,
      ultime4Cifre: ultime4Cifre || null,
      circuito: circuito || null,
      autorizzazione: autorizzazione || null,
      stato,
      errore,
      operatore: auth.user.name || auth.user.email,
      note: note || null,
    },
  })

  await audit({
    hostId: auth.user.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'pagamento.checkout',
    entita: 'prenotazione',
    entitaId: prenotazioneId,
    dettagli: `Pagamento €${importo} via ${metodo} (${provider}) — ${pren.guestCognome} ${pren.guestNome}`,
  })

  return NextResponse.json(pagamento, { status: 201 })
}

/**
 * GET /api/host/pagamento-checkout?prenotazioneId=xxx
 * Lista pagamenti di una prenotazione.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const prenotazioneId = req.nextUrl.searchParams.get('prenotazioneId')
  if (!prenotazioneId) return NextResponse.json({ error: 'prenotazioneId obbligatorio' }, { status: 400 })

  const pagamenti = await prisma.pagamentoCheckout.findMany({
    where: { prenotazioneId, hostId: auth.user.hostId },
    orderBy: { createdAt: 'desc' },
  })

  const totale = pagamenti.filter(p => p.stato === 'COMPLETATO').reduce((s, p) => s + p.importo, 0)

  return NextResponse.json({ pagamenti, totalePagato: Math.round(totale * 100) / 100 })
}
