import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { verificaGiftCard } from '@/lib/gift-card'

/**
 * GET /api/host/spa/gift-card/verifica/[codice]
 *
 * Lookup read-only per UI: verifica validità + ritorna saldo.
 * Non modifica stato. Richiede auth host (evita enumeration da outside).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ codice: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { codice } = await params

  const result = await verificaGiftCard(codice, auth.user.hostId)
  return NextResponse.json({
    valida: result.valida,
    errore: result.errore,
    giftCard: result.giftCard ? {
      codice: result.giftCard.codice,
      stato: result.giftCard.stato,
      valoreOriginale: result.giftCard.valoreOriginale,
      saldoResiduo: result.giftCard.saldoResiduo,
      dataScadenza: result.giftCard.dataScadenza,
    } : null,
  })
}
