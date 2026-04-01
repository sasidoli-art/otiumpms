// TODO: i18n
import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'
import { sendEmailGeneric } from '@/lib/email'

// ─── Gift card code generator ────────────────────────────────────────────────

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusing chars
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `OW-${part()}-${part()}`
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const giftCardCreateSchema = z.object({
  tipo: z.enum(['IMPORTO', 'TRATTAMENTO']),
  valore: z.coerce.number().positive('Valore deve essere positivo'),
  trattamentoId: z.string().optional().nullable(),
  acquirenteNome: z.string().min(1, 'Nome acquirente obbligatorio').max(200).trim(),
  acquirenteEmail: z.string().email('Email acquirente non valida').max(254).trim().toLowerCase(),
  destinatarioNome: z.string().max(200).trim().optional().nullable(),
  destinatarioEmail: z.string().email().max(254).trim().toLowerCase().optional().nullable().or(z.literal('')),
  messaggio: z.string().max(1000).trim().optional().nullable(),
  dataScadenza: z.string().optional().nullable(), // ISO date
})

// ─── GET: list gift cards ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const search = searchParams.get('search')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { hostId: auth.user.hostId }

  if (stato) where.stato = stato
  if (search) {
    where.OR = [
      { codice: { contains: search, mode: 'insensitive' } },
      { acquirenteNome: { contains: search, mode: 'insensitive' } },
      { destinatarioNome: { contains: search, mode: 'insensitive' } },
    ]
  }

  const giftCards = await prisma.giftCard.findMany({
    where,
    include: {
      _count: { select: { movimenti: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(giftCards)
}

// ─── POST: create gift card ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(giftCardCreateSchema, await req.json())
  if (parsed.error) return parsed.error
  const data = parsed.data

  // Generate unique code (retry up to 5 times)
  let codice = ''
  for (let i = 0; i < 5; i++) {
    const candidate = generateGiftCardCode()
    const existing = await prisma.giftCard.findUnique({ where: { codice: candidate } })
    if (!existing) { codice = candidate; break }
  }
  if (!codice) {
    return NextResponse.json({ error: 'Impossibile generare codice univoco' }, { status: 500 })
  }

  const scadenza = data.dataScadenza
    ? new Date(data.dataScadenza)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // default 1 year

  const giftCard = await prisma.giftCard.create({
    data: {
      hostId: auth.user.hostId,
      codice,
      tipo: data.tipo,
      valoreOriginale: data.valore,
      saldoResiduo: data.valore,
      acquirenteNome: data.acquirenteNome,
      acquirenteEmail: data.acquirenteEmail,
      destinatarioNome: data.destinatarioNome || null,
      destinatarioEmail: data.destinatarioEmail || null,
      messaggio: data.messaggio || null,
      trattamentoId: data.trattamentoId || null,
      dataScadenza: scadenza,
      stato: 'ATTIVA',
    },
  })

  // Create initial movement
  await prisma.giftCardMovimento.create({
    data: {
      giftCardId: giftCard.id,
      tipo: 'EMISSIONE',
      importo: data.valore,
      saldoDopo: data.valore,
      descrizione: 'Emissione gift card',
    },
  })

  // Send email to destinatario if provided
  if (data.destinatarioEmail) {
    try {
      const msgExtra = data.messaggio ? `\n\nMessaggio: "${data.messaggio}"` : ''
      await sendEmailGeneric({
        to: data.destinatarioEmail,
        subject: 'Hai ricevuto una Gift Card Otium Week!',
        text: `Ciao${data.destinatarioNome ? ` ${data.destinatarioNome}` : ''},\n\n${data.acquirenteNome} ti ha regalato una Gift Card!\n\nCodice: ${codice}\nValore: ${data.valore.toFixed(2)} EUR\nScadenza: ${scadenza.toLocaleDateString('it-IT')}${msgExtra}\n\nPresentala al momento della prenotazione per riscattarla.`,
        hostId: auth.user.hostId,
      })
    } catch {
      // Non bloccare la creazione se l'email fallisce
    }
  }

  return NextResponse.json(giftCard, { status: 201 })
}
