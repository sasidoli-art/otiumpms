import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/rate-limit'
import { registraConsenso, CONSENT_TYPES, type ConsentType } from '@/lib/consent'
import { logger } from '@/lib/logger'

/**
 * POST /api/consent — Pubblico
 *
 * Registra (o revoca) un consenso GDPR (Art. 7).
 * Ogni chiamata crea un nuovo record nella storia immutabile UserConsent.
 *
 * Body:
 *  - tipo: ConsentType (obbligatorio)
 *  - versione: string (obbligatorio)
 *  - accettato: boolean (default true)
 *  - hostId: string (obbligatorio per ospiti)
 *  - guestEmail | guestToken | userId: almeno uno
 *  - metodo: 'checkbox' | 'firma_digitale' | 'double_opt_in' | 'api'
 *  - revocaMotivo: se accettato=false
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tipo, versione, accettato = true, hostId, guestEmail, guestToken, userId, metodo, revocaMotivo } = body

    if (!tipo || !(tipo in CONSENT_TYPES)) {
      return NextResponse.json({ error: 'tipo non valido' }, { status: 400 })
    }
    if (!versione) {
      return NextResponse.json({ error: 'versione richiesta' }, { status: 400 })
    }
    if (!hostId) {
      return NextResponse.json({ error: 'hostId richiesto' }, { status: 400 })
    }
    if (!guestEmail && !guestToken && !userId) {
      return NextResponse.json({ error: 'serve guestEmail, guestToken o userId' }, { status: 400 })
    }

    const consent = await registraConsenso({
      hostId,
      tipo: tipo as ConsentType,
      versione,
      accettato,
      guestEmail,
      guestToken,
      userId,
      metodo: metodo ?? 'checkbox',
      revocaMotivo: revocaMotivo ?? null,
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent') ?? null,
    })

    return NextResponse.json({ ok: true, id: consent.id, createdAt: consent.createdAt })
  } catch (err) {
    logger.error('POST /api/consent', 'consent', {
      error: err instanceof Error ? err.message : String(err),
    })
    const msg = err instanceof Error ? err.message : 'Errore'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
