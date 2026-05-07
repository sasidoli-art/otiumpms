
import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

const giftCardUpdateSchema = z.object({
  stato: z.enum(['ATTIVA', 'SCADUTA', 'UTILIZZATA', 'SCADUTA', 'ANNULLATA']).optional(),
  ricarica: z.coerce.number().positive().optional(),
})

// ─── GET: single gift card with movimenti ────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const giftCard = await prisma.giftCard.findFirst({
    where: { id, hostId: auth.user.hostId },
    include: {
      movimenti: { orderBy: { createdAt: 'desc' } },
      trattamento: { select: { id: true, nome: true, prezzo: true } },
    },
  })

  if (!giftCard) {
    return NextResponse.json({ error: 'Gift card non trovata' }, { status: 404 })
  }

  return NextResponse.json(giftCard)
}

// ─── PATCH: update stato or ricarica ─────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const parsed = parseBody(giftCardUpdateSchema, await req.json())
  if (parsed.error) return parsed.error
  const data = parsed.data

  const giftCard = await prisma.giftCard.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!giftCard) {
    return NextResponse.json({ error: 'Gift card non trovata' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}

  if (data.stato) {
    updateData.stato = data.stato
  }

  if (data.ricarica) {
    const nuovoSaldo = giftCard.saldoResiduo + data.ricarica
    updateData.saldoResiduo = nuovoSaldo
    updateData.stato = 'ATTIVA'

    await prisma.giftCardMovimento.create({
      data: {
        giftCardId: id,
        tipo: 'RICARICA',
        importo: data.ricarica,
        saldoDopo: nuovoSaldo,
        descrizione: `Ricarica di ${data.ricarica.toFixed(2)} EUR`,
      },
    })
  }

  const updated = await prisma.giftCard.update({
    where: { id },
    data: updateData,
    include: {
      movimenti: { orderBy: { createdAt: 'desc' } },
    },
  })

  return NextResponse.json(updated)
}

// ─── DELETE: annulla gift card ───────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const giftCard = await prisma.giftCard.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!giftCard) {
    return NextResponse.json({ error: 'Gift card non trovata' }, { status: 404 })
  }

  await prisma.giftCardMovimento.create({
    data: {
      giftCardId: id,
      tipo: 'RIMBORSO',
      importo: -giftCard.saldoResiduo,
      saldoDopo: 0,
      descrizione: 'Gift card annullata',
    },
  })

  const updated = await prisma.giftCard.update({
    where: { id },
    data: { stato: 'ANNULLATA', saldoResiduo: 0 },
  })

  return NextResponse.json(updated)
}
