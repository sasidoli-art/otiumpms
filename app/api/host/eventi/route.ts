import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { parseBody, eventoCreateSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'
import { StatoEvento } from '@prisma/client'

const STATI_EVENTO = Object.values(StatoEvento)

function isStatoEvento(s: string): s is StatoEvento {
  return (STATI_EVENTO as string[]).includes(s)
}

// GET /api/host/eventi
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')

  const eventi = await prisma.evento.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(stato && isStatoEvento(stato) ? { stato } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(eventi)
}

// POST /api/host/eventi
export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(eventoCreateSchema, raw)
  if (parsed.error) return parsed.error
  const {
    titolo, descrizione, categoria, dataInizio, dataFine, orario,
    luogo, citta, regione, indirizzo, prezzo,
    urlBiglietti, urlEvento, immagine, visibilitaNaz, regioni,
  } = parsed.data

  const evento = await prisma.evento.create({
    data: {
      hostId: auth.user.hostId,
      titolo,
      descrizione: descrizione ?? null,
      categoria,
      stato: 'IN_ATTESA',
      dataInizio: new Date(dataInizio),
      dataFine: dataFine ? new Date(dataFine) : null,
      orario: orario ?? null,
      luogo: luogo ?? null,
      citta,
      regione,
      indirizzo: indirizzo ?? null,
      prezzo: prezzo ?? null,
      urlBiglietti: urlBiglietti || null,
      urlEvento: urlEvento || null,
      immagine: immagine ?? null,
      visibilitaNaz,
      regioni,
    },
  })

  logger.info('Evento creato', 'host/eventi', {
    eventoId: evento.id,
    hostId: auth.user.hostId,
  })

  return NextResponse.json(evento, { status: 201 })
}
