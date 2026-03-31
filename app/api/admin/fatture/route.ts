import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generaNumeroFattura } from '@/lib/utils'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { parseBody, fatturaCreateSchema, isStatoFattura } from '@/lib/validations'
import { logger } from '@/lib/logger'

// GET /api/admin/fatture
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const hostId = searchParams.get('hostId')

  const fatture = await prisma.fattura.findMany({
    where: {
      ...(stato && isStatoFattura(stato) ? { stato } : {}),
      ...(hostId ? { hostId } : {}),
    },
    include: { host: { select: { nomeAzienda: true } } },
    orderBy: { dataEmissione: 'desc' },
  })

  return NextResponse.json(fatture)
}

// POST /api/admin/fatture
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(fatturaCreateSchema, raw)
  if (parsed.error) return parsed.error
  const {
    hostId, righe, imponibile, iva, totale, aliquotaIva,
    dataScadenza, note,
    clienteNome, clientePIva, clienteCF, clienteIndirizzo,
    clienteCitta, clienteCap, clienteProvincia, clientePaese,
    clienteEmail, clientePec, clienteSDI,
  } = parsed.data

  // Verifica esistenza host
  const hostEsiste = await prisma.host.findUnique({ where: { id: hostId }, select: { id: true } })
  if (!hostEsiste) {
    return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  }

  // Numero fattura progressivo per anno (con lock ottimistico)
  const anno = new Date().getFullYear()
  const count = await prisma.fattura.count({ where: { anno } })
  const numero = generaNumeroFattura(anno, count + 1)

  const fattura = await prisma.fattura.create({
    data: {
      hostId,
      numero,
      anno,
      righe,
      imponibile,
      iva,
      totale,
      aliquotaIva,
      dataScadenza: dataScadenza ? new Date(dataScadenza) : null,
      note: note ?? null,
      clienteNome,
      clientePIva: clientePIva ?? null,
      clienteCF: clienteCF ?? null,
      clienteIndirizzo: clienteIndirizzo ?? null,
      clienteCitta: clienteCitta ?? null,
      clienteCap: clienteCap ?? null,
      clienteProvincia: clienteProvincia ?? null,
      clientePaese,
      clienteEmail: clienteEmail || null,
      clientePec: clientePec || null,
      clienteSDI: clienteSDI ?? null,
    },
  })

  logger.info('Fattura creata', 'admin/fatture', {
    fatturaId: fattura.id,
    numero: fattura.numero,
    hostId,
  })

  return NextResponse.json(fattura, { status: 201 })
}
