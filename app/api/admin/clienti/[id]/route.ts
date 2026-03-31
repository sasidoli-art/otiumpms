import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { parseBody, clienteUpdateSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

// GET /api/admin/clienti/[id]
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true, nome: true, cognome: true, createdAt: true, attivo: true } },
      eventi: { orderBy: { createdAt: 'desc' }, take: 20 },
      fatture: { orderBy: { createdAt: 'desc' }, take: 20 },
      pagamenti: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(host)
}

// PATCH /api/admin/clienti/[id]
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: params.id },
    include: { user: true },
  })
  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(clienteUpdateSchema, raw)
  if (parsed.error) return parsed.error
  const {
    nomeAzienda, partitaIva, codiceFiscale, telefono,
    piano, statoAbbonamento, dataInizioAbb, dataFineAbb,
    indirizzo, citta, provincia, cap, regione, note, attivo,
  } = parsed.data

  // Aggiorna host
  const updated = await prisma.host.update({
    where: { id: params.id },
    data: {
      nomeAzienda: nomeAzienda ?? host.nomeAzienda,
      partitaIva: partitaIva !== undefined ? partitaIva : host.partitaIva,
      codiceFiscale: codiceFiscale !== undefined ? codiceFiscale : host.codiceFiscale,
      telefono: telefono !== undefined ? telefono : host.telefono,
      piano: piano ?? host.piano,
      statoAbbonamento: statoAbbonamento ?? host.statoAbbonamento,
      dataInizioAbb: dataInizioAbb !== undefined
        ? (dataInizioAbb ? new Date(dataInizioAbb) : null)
        : host.dataInizioAbb,
      dataFineAbb: dataFineAbb !== undefined
        ? (dataFineAbb ? new Date(dataFineAbb) : null)
        : host.dataFineAbb,
      indirizzo: indirizzo !== undefined ? indirizzo : host.indirizzo,
      citta: citta !== undefined ? citta : host.citta,
      provincia: provincia !== undefined ? provincia : host.provincia,
      cap: cap !== undefined ? cap : host.cap,
      regione: regione !== undefined ? regione : host.regione,
      note: note !== undefined ? note : host.note,
    },
  })

  // Aggiorna attivo sullo User se fornito
  if (attivo !== undefined) {
    await prisma.user.update({
      where: { id: host.userId },
      data: { attivo },
    })
  }

  logger.info('Cliente aggiornato', 'admin/clienti/[id]', {
    hostId: params.id,
  })

  return NextResponse.json(updated)
}
