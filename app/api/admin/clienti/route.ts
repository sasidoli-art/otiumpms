import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { parseBody, clienteCreateSchema, isStatoAbbonamento, isPianoTipo } from '@/lib/validations'
import { logger } from '@/lib/logger'

// GET /api/admin/clienti
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const piano = searchParams.get('piano')
  const stato = searchParams.get('stato')

  const hosts = await prisma.host.findMany({
    where: {
      ...(piano && isPianoTipo(piano) ? { piano } : {}),
      ...(stato && isStatoAbbonamento(stato) ? { statoAbbonamento: stato } : {}),
      ...(q
        ? {
            OR: [
              { nomeAzienda: { contains: q, mode: 'insensitive' } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
              { user: { nome: { contains: q, mode: 'insensitive' } } },
              { user: { cognome: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { email: true, nome: true, cognome: true } },
      _count: { select: { eventi: true, fatture: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(hosts)
}

// POST /api/admin/clienti
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(clienteCreateSchema, raw)
  if (parsed.error) return parsed.error
  const {
    email, password, nome, cognome,
    nomeAzienda, partitaIva, codiceFiscale, telefono, piano,
    statoAbbonamento, dataInizioAbb, dataFineAbb,
    indirizzo, citta, provincia, cap, regione, note,
  } = parsed.data

  const esistente = await prisma.user.findUnique({ where: { email } })
  if (esistente) {
    return NextResponse.json({ error: 'Email già registrata' }, { status: 409 })
  }

  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.default.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      password: hash,
      nome,
      cognome,
      role: 'HOST',
      host: {
        create: {
          nomeAzienda,
          partitaIva: partitaIva ?? null,
          codiceFiscale: codiceFiscale ?? null,
          telefono: telefono ?? null,
          piano,
          statoAbbonamento: statoAbbonamento ?? 'IN_PROVA',
          dataInizioAbb: dataInizioAbb ? new Date(dataInizioAbb) : null,
          dataFineAbb: dataFineAbb ? new Date(dataFineAbb) : null,
          indirizzo: indirizzo ?? null,
          citta: citta ?? null,
          provincia: provincia ?? null,
          cap: cap ?? null,
          regione: regione ?? null,
          note: note ?? null,
        },
      },
    },
    include: { host: true },
  })

  logger.info('Nuovo cliente creato', 'admin/clienti', {
    userId: user.id,
    email: user.email,
  })

  // Non ritornare l'hash della password nella risposta
  const { password: _pw, ...userSafe } = user
  return NextResponse.json(userSafe, { status: 201 })
}
