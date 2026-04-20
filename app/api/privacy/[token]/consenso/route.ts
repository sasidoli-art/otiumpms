import { NextRequest, NextResponse } from 'next/server'
import { verificaPortaleToken, registraConsenso, CONSENT_TYPES, type ConsentType } from '@/lib/consent'
import { getClientIp } from '@/lib/rate-limit'

/**
 * PATCH /api/privacy/[token]/consenso
 * Body: { tipo, accettato, versione?, revocaMotivo? }
 *
 * Registra un cambio di consenso dal portale ospite.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const subject = verificaPortaleToken(token)
  if (!subject) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body malformato' }, { status: 400 })
  }

  const { tipo, accettato, versione, revocaMotivo } = body as {
    tipo?: string
    accettato?: boolean
    versione?: string
    revocaMotivo?: string
  }

  if (!tipo || !(tipo in CONSENT_TYPES)) {
    return NextResponse.json({ error: 'tipo non valido' }, { status: 400 })
  }
  if (typeof accettato !== 'boolean') {
    return NextResponse.json({ error: 'accettato richiesto' }, { status: 400 })
  }
  const tipoKey = tipo as ConsentType
  if (!CONSENT_TYPES[tipoKey].revocabile && !accettato) {
    return NextResponse.json(
      { error: `Il consenso ${tipo} non è revocabile (necessario per il servizio)` },
      { status: 422 },
    )
  }

  try {
    const consent = await registraConsenso({
      hostId: subject.hostId,
      tipo: tipoKey,
      versione: versione ?? '1.0',
      accettato,
      guestEmail: subject.email,
      guestToken: token,
      metodo: 'checkbox',
      revocaMotivo: (revocaMotivo as 'richiesta_ospite') ?? 'richiesta_ospite',
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent') ?? null,
    })
    return NextResponse.json({ ok: true, id: consent.id, accettato })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
