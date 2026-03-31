import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { parseBody, pagamentoCreateSchema, isStatoPagamento } from '@/lib/validations'
import { logger } from '@/lib/logger'

// GET /api/admin/pagamenti
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const hostId = searchParams.get('hostId')

  const pagamenti = await prisma.pagamento.findMany({
    where: {
      ...(stato && isStatoPagamento(stato) ? { stato } : {}),
      ...(hostId ? { hostId } : {}),
    },
    include: {
      host: { select: { nomeAzienda: true } },
      fattura: { select: { numero: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(pagamenti)
}

// POST /api/admin/pagamenti
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(pagamentoCreateSchema, raw)
  if (parsed.error) return parsed.error
  const {
    hostId, importo, descrizione, dataScadenza,
    abbonamentoId, metodo, riferimento, note,
  } = parsed.data

  // Verifica esistenza host
  const hostEsiste = await prisma.host.findUnique({ where: { id: hostId }, select: { id: true } })
  if (!hostEsiste) {
    return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  }

  const pagamento = await prisma.pagamento.create({
    data: {
      hostId,
      importo,
      descrizione: descrizione ?? null,
      dataScadenza: dataScadenza ? new Date(dataScadenza) : null,
      abbonamentoId: abbonamentoId ?? null,
      metodo: metodo ?? null,
      riferimento: riferimento ?? null,
      note: note ?? null,
    },
  })

  logger.info('Pagamento creato', 'admin/pagamenti', {
    pagamentoId: pagamento.id,
    hostId,
    importo,
  })

  return NextResponse.json(pagamento, { status: 201 })
}
