// TODO: i18n
import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

const transazioneUpdateSchema = z.object({
  stato: z.enum(['COMPLETATA', 'ANNULLATA']),
})

// ─── GET: single transazione with voci ───────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const transazione = await prisma.transazionePOS.findFirst({
    where: { id, hostId: auth.user.hostId },
    include: {
      voci: { orderBy: { createdAt: 'asc' } },
      giftCard: { select: { id: true, codice: true, saldoResiduo: true } },
    },
  })

  if (!transazione) {
    return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
  }

  return NextResponse.json(transazione)
}

// ─── PATCH: complete or cancel transazione ───────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const parsed = parseBody(transazioneUpdateSchema, await req.json())
  if (parsed.error) return parsed.error
  const data = parsed.data

  const transazione = await prisma.transazionePOS.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!transazione) {
    return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
  }

  // If cancelling and gift card was used, refund it
  if (data.stato === 'ANNULLATA' && transazione.giftCardId && transazione.stato !== 'ANNULLATA') {
    const gc = await prisma.giftCard.findUnique({ where: { id: transazione.giftCardId } })
    if (gc) {
      const nuovoSaldo = gc.saldoResiduo + transazione.totale
      await prisma.$transaction([
        prisma.giftCard.update({
          where: { id: gc.id },
          data: { saldoResiduo: nuovoSaldo, stato: 'ATTIVA' },
        }),
        prisma.giftCardMovimento.create({
          data: {
            giftCardId: gc.id,
            tipo: 'RIMBORSO',
            importo: transazione.totale,
            saldoDopo: nuovoSaldo,
            descrizione: `Rimborso annullamento POS #${transazione.id.slice(-6)}`,
          },
        }),
      ])
    }
  }

  const updated = await prisma.transazionePOS.update({
    where: { id },
    data: { stato: data.stato },
    include: { voci: { orderBy: { createdAt: 'asc' } } },
  })

  return NextResponse.json(updated)
}
