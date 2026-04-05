
import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const vocePOSSchema = z.object({
  tipo: z.enum(['TRATTAMENTO', 'PRODOTTO', 'PACCHETTO']),
  nome: z.string().min(1).max(300).trim(),
  quantita: z.coerce.number().int().min(1).default(1),
  prezzoUnitario: z.coerce.number().min(0),
  sconto: z.coerce.number().min(0).default(0),
  trattamentoId: z.string().optional().nullable(),
})

const transazionePOSCreateSchema = z.object({
  voci: z.array(vocePOSSchema).min(1, 'Almeno una voce obbligatoria'),
  metodoPagamento: z.enum(['CONTANTI', 'CARTA', 'CAMERA_CREDIT', 'GIFT_CARD', 'MISTO']),
  giftCardCodice: z.string().optional().nullable(),
  clienteNome: z.string().max(200).trim().optional().nullable(),
  clienteEmail: z.string().email().max(254).trim().toLowerCase().optional().nullable().or(z.literal('')),
  prenotazioneId: z.string().optional().nullable(),
  sconto: z.coerce.number().min(0).default(0),
  note: z.string().max(1000).trim().optional().nullable(),
})

// ─── GET: list transazioni ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const da = searchParams.get('da')
  const a = searchParams.get('a')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { hostId: auth.user.hostId }

  if (stato) where.stato = stato
  if (da || a) {
    where.createdAt = {}
    if (da) where.createdAt.gte = new Date(da)
    if (a) where.createdAt.lte = new Date(a + 'T23:59:59.999Z')
  }

  const transazioni = await prisma.transazionePOS.findMany({
    where,
    include: {
      voci: true,
      _count: { select: { voci: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json(transazioni)
}

// ─── POST: create transazione ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(transazionePOSCreateSchema, await req.json())
  if (parsed.error) return parsed.error
  const data = parsed.data

  // Calculate totals
  const subtotale = data.voci.reduce((sum, v) => {
    return sum + (v.prezzoUnitario * (v.quantita ?? 1)) - (v.sconto ?? 0)
  }, 0)
  const totale = Math.max(0, subtotale - (data.sconto ?? 0))

  // Handle gift card payment
  let giftCardId: string | null = null
  if (data.metodoPagamento === 'GIFT_CARD' && data.giftCardCodice) {
    const giftCard = await prisma.giftCard.findFirst({
      where: {
        codice: data.giftCardCodice.toUpperCase(),
        hostId: auth.user.hostId,
        stato: 'ATTIVA',
      },
    })
    if (!giftCard) {
      return NextResponse.json({ error: 'Gift card non trovata o non attiva' }, { status: 400 })
    }
    if (giftCard.dataScadenza && new Date(giftCard.dataScadenza) < new Date()) {
      return NextResponse.json({ error: 'Gift card scaduta' }, { status: 400 })
    }
    if (giftCard.saldoResiduo < totale) {
      return NextResponse.json({
        error: `Saldo gift card insufficiente (${giftCard.saldoResiduo.toFixed(2)} EUR)`,
        saldoDisponibile: giftCard.saldoResiduo,
      }, { status: 400 })
    }
    giftCardId = giftCard.id
  }

  // Create transazione with voci
  const transazione = await prisma.transazionePOS.create({
    data: {
      hostId: auth.user.hostId,
      subtotale,
      scontoImporto: data.sconto ?? 0,
      totale,
      metodoPagamento: data.metodoPagamento,
      giftCardId,
      guestNome: data.clienteNome || null,
      guestEmail: data.clienteEmail || null,
      prenotazioneId: data.prenotazioneId || null,
      note: data.note || null,
      operatore: auth.user.name ?? 'Sistema',
      stato: 'COMPLETATA',
      voci: {
        create: data.voci.map((v) => ({
          tipo: v.tipo,
          descrizione: v.nome,
          quantita: v.quantita ?? 1,
          prezzoUnitario: v.prezzoUnitario,
          sconto: v.sconto ?? 0,
          totale: (v.prezzoUnitario * (v.quantita ?? 1)) - (v.sconto ?? 0),
          trattamentoId: v.trattamentoId || null,
        })),
      },
    },
    include: { voci: true },
  })

  // Deduct gift card if used
  if (giftCardId && data.giftCardCodice) {
    const gc = await prisma.giftCard.findUnique({ where: { id: giftCardId } })
    if (gc) {
      const nuovoSaldo = gc.saldoResiduo - totale
      await prisma.$transaction([
        prisma.giftCard.update({
          where: { id: giftCardId },
          data: { saldoResiduo: nuovoSaldo, stato: nuovoSaldo <= 0 ? 'UTILIZZATA' : 'ATTIVA' },
        }),
        prisma.giftCardMovimento.create({
          data: {
            giftCardId,
            tipo: 'UTILIZZO',
            importo: -totale,
            saldoDopo: nuovoSaldo,
            descrizione: `Pagamento POS`,
          },
        }),
      ])
    }
  }

    await auditFromAuth(auth, { azione: 'pos.transazione', entita: 'transazione_pos', dettagli: 'Transazione POS' })

return NextResponse.json(transazione, { status: 201 })
}
