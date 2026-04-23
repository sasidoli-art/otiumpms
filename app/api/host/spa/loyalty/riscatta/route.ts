import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { riscattaPremio } from '@/lib/fedelta'

const schema = z.object({
  membroId: z.string().min(1),
  premioId: z.string().min(1),
  prenotazioneId: z.string().nullable().optional(),
  appuntamentoSpaSlot: z.object({
    dataOra: z.string().datetime(),
    durataMin: z.number().int().min(10).max(480),
  }).nullable().optional(),
})

/**
 * POST /api/host/spa/loyalty/riscatta
 * L'host (o l'operatore) riscatta un premio per conto del membro.
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }

  // Verifica ownership: membro + premio appartengono all'host
  const [membro, premio] = await Promise.all([
    prisma.membroFedelta.findFirst({
      where: { id: parsed.data.membroId, programma: { hostId: auth.user.hostId } },
      select: { id: true },
    }),
    prisma.premioFedelta.findFirst({
      where: { id: parsed.data.premioId, programma: { hostId: auth.user.hostId } },
      select: { id: true },
    }),
  ])
  if (!membro || !premio) {
    return NextResponse.json({ error: 'Membro o premio non trovato' }, { status: 404 })
  }

  const slot = parsed.data.appuntamentoSpaSlot
    ? {
        dataOra: new Date(parsed.data.appuntamentoSpaSlot.dataOra),
        durataMin: parsed.data.appuntamentoSpaSlot.durataMin,
      }
    : undefined

  const result = await riscattaPremio({
    membroId: parsed.data.membroId,
    premioId: parsed.data.premioId,
    prenotazioneId: parsed.data.prenotazioneId ?? undefined,
    appuntamentoSpaSlot: slot,
    operatore: auth.user.email ?? auth.user.id,
  })

  if (!result.successo) {
    return NextResponse.json({ error: result.errore }, { status: 400 })
  }

  await auditFromAuth(auth, {
    azione: 'loyalty.premio_riscattato',
    entita: 'PremioFedelta',
    entitaId: parsed.data.premioId,
    dettagli: `Riscatto per membro ${parsed.data.membroId}. Saldo residuo: ${result.saldoResiduo}`,
  })

  return NextResponse.json(result)
}
