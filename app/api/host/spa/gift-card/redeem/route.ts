// TODO: i18n
import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

const redeemSchema = z.object({
  codice: z.string().min(1, 'Codice obbligatorio').trim().toUpperCase(),
  importo: z.coerce.number().positive('Importo deve essere positivo'),
  descrizione: z.string().max(500).trim().optional().nullable(),
  appuntamentoId: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(redeemSchema, await req.json())
  if (parsed.error) return parsed.error
  const data = parsed.data

  const giftCard = await prisma.giftCard.findFirst({
    where: {
      codice: data.codice,
      hostId: auth.user.hostId,
      stato: 'ATTIVA',
    },
  })

  if (!giftCard) {
    return NextResponse.json({ error: 'Gift card non trovata o non attiva' }, { status: 404 })
  }

  // Check expiry
  if (giftCard.dataScadenza && new Date(giftCard.dataScadenza) < new Date()) {
    await prisma.giftCard.update({
      where: { id: giftCard.id },
      data: { stato: 'SCADUTA' },
    })
    return NextResponse.json({ error: 'Gift card scaduta' }, { status: 400 })
  }

  // Check balance
  if (giftCard.saldoResiduo < data.importo) {
    return NextResponse.json({
      error: `Saldo insufficiente. Disponibile: ${giftCard.saldoResiduo.toFixed(2)} EUR`,
      saldoDisponibile: giftCard.saldoResiduo,
    }, { status: 400 })
  }

  const nuovoSaldo = giftCard.saldoResiduo - data.importo
  const nuovoStato = nuovoSaldo <= 0 ? 'UTILIZZATA' : 'ATTIVA'

  // Update card + create movement in transaction
  const [updated] = await prisma.$transaction([
    prisma.giftCard.update({
      where: { id: giftCard.id },
      data: { saldoResiduo: nuovoSaldo, stato: nuovoStato },
    }),
    prisma.giftCardMovimento.create({
      data: {
        giftCardId: giftCard.id,
        tipo: 'UTILIZZO',
        importo: -data.importo,
        saldoDopo: nuovoSaldo,
        descrizione: data.descrizione || `Utilizzo di ${data.importo.toFixed(2)} EUR`,
        appuntamentoId: data.appuntamentoId || null,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    giftCard: updated,
    importoScalato: data.importo,
    saldoResiduo: nuovoSaldo,
  })
}
