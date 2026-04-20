import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { DPA_VERSIONE } from '@/lib/dpa-template'
import { logger } from '@/lib/logger'

/**
 * GET /api/host/dpa — stato DPA dell'host (accettato + storico accettazioni)
 */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const [host, accettazioni] = await Promise.all([
    prisma.host.findUnique({
      where: { id: auth.user.hostId },
      select: { dpaAccettato: true, nomeAzienda: true },
    }),
    prisma.dPAAccettazione.findMany({
      where: { hostId: auth.user.hostId },
      orderBy: { accettatoAt: 'desc' },
    }),
  ])

  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const ultimoAccettato = accettazioni[0]
  const versioneCorrente = ultimoAccettato?.versione ?? null
  const versioneCorrisponde = versioneCorrente === DPA_VERSIONE
  const richiesta = !host.dpaAccettato || !versioneCorrisponde

  return NextResponse.json({
    dpaAccettato: host.dpaAccettato && versioneCorrisponde,
    versioneUltima: versioneCorrente,
    versioneTemplate: DPA_VERSIONE,
    richiestaAccettazione: richiesta,
    accettazioni,
  })
}

/**
 * POST /api/host/dpa — accetta il DPA corrente (versione DPA_VERSIONE).
 * Body: { firmaBase64?, firmaNome, firmaRuolo? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  let body: { firmaBase64?: string; firmaNome?: string; firmaRuolo?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body malformato' }, { status: 400 })
  }

  const firmaNome = body.firmaNome?.trim()
  if (!firmaNome || firmaNome.length < 2) {
    return NextResponse.json({ error: 'Nome firmatario obbligatorio' }, { status: 400 })
  }
  if (!body.firmaBase64 || body.firmaBase64.length < 100) {
    return NextResponse.json({ error: 'Firma digitale obbligatoria' }, { status: 400 })
  }

  const accettazione = await prisma.$transaction(async (tx) => {
    const acc = await tx.dPAAccettazione.create({
      data: {
        hostId: auth.user.hostId,
        versione: DPA_VERSIONE,
        firmaBase64: body.firmaBase64,
        firmaNome,
        firmaRuolo: body.firmaRuolo?.trim() || null,
        ip: getClientIp(req),
        userAgent: req.headers.get('user-agent'),
      },
    })
    await tx.host.update({
      where: { id: auth.user.hostId },
      data: { dpaAccettato: true },
    })
    return acc
  })

  await audit({
    hostId: auth.user.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'gdpr.dpa.accettato',
    entita: 'host',
    entitaId: auth.user.hostId,
    dettagli: `DPA versione ${DPA_VERSIONE} accettato da ${firmaNome}${body.firmaRuolo ? ` (${body.firmaRuolo})` : ''}`,
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent'),
  })

  logger.info('DPA accettato', 'host/dpa', {
    hostId: auth.user.hostId,
    versione: DPA_VERSIONE,
    firmatario: firmaNome,
  })

  return NextResponse.json({ ok: true, id: accettazione.id, versione: DPA_VERSIONE })
}
