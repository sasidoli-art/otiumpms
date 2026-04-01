import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

// TODO: i18n

const enrollSchema = z.object({
  ospiteId: z.string().min(1, 'ID ospite obbligatorio'),
})

// ─── GET: lista membri con punti, livello, ultima attività ───────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const programma = await prisma.programmaFedelta.findFirst({
    where: { hostId: auth.user.hostId },
    select: { id: true },
  })

  if (!programma) {
    return NextResponse.json({ membri: [], totale: 0 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))
  const skip = (page - 1) * limit

  const where = {
    programmaId: programma.id,
    ...(search
      ? {
          ospite: {
            OR: [
              { nome: { contains: search, mode: 'insensitive' as const } },
              { cognome: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  }

  const [membri, totale] = await Promise.all([
    prisma.membroFedelta.findMany({
      where,
      include: {
        ospite: { select: { id: true, nome: true, cognome: true, email: true, telefono: true, vip: true } },
        livello: { select: { id: true, nome: true, colore: true, scontoPercentuale: true } },
      },
      orderBy: { ultimaAttivita: 'desc' },
      skip,
      take: limit,
    }),
    prisma.membroFedelta.count({ where }),
  ])

  // Calcola livello corrente per ogni membro (basato su punti accumulati)
  const livelli = await prisma.livelloFedelta.findMany({
    where: { programmaId: programma.id },
    orderBy: { puntiMinimi: 'desc' },
  })

  const membriConLivello = membri.map((m) => {
    const saldo = m.puntiAccumulati - m.puntiUtilizzati
    const livelloCalcolato = livelli.find((l) => m.puntiAccumulati >= l.puntiMinimi)
    return {
      ...m,
      saldoPunti: saldo,
      livelloCalcolato: livelloCalcolato
        ? { id: livelloCalcolato.id, nome: livelloCalcolato.nome, colore: livelloCalcolato.colore, scontoPercentuale: livelloCalcolato.scontoPercentuale }
        : null,
    }
  })

  return NextResponse.json({ membri: membriConLivello, totale, page, limit })
}

// ─── POST: iscrivi un ospite CRM al programma ───────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(enrollSchema, await req.json())
  if (parsed.error) return parsed.error

  const programma = await prisma.programmaFedelta.findFirst({
    where: { hostId: auth.user.hostId },
  })
  if (!programma) {
    return NextResponse.json({ error: 'Nessun programma fedeltà attivo' }, { status: 400 })
  }

  // Verifica che l'ospite esista e appartenga all'host
  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: parsed.data.ospiteId, hostId: auth.user.hostId },
  })
  if (!ospite) {
    return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 })
  }

  // Verifica che non sia già iscritto
  const existing = await prisma.membroFedelta.findUnique({
    where: { programmaId_ospiteId: { programmaId: programma.id, ospiteId: ospite.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Ospite già iscritto al programma' }, { status: 409 })
  }

  const membro = await prisma.membroFedelta.create({
    data: {
      programmaId: programma.id,
      ospiteId: ospite.id,
      puntiAccumulati: 0,
      puntiUtilizzati: 0,
      ultimaAttivita: new Date(),
    },
    include: {
      ospite: { select: { id: true, nome: true, cognome: true, email: true } },
    },
  })

  return NextResponse.json(membro, { status: 201 })
}
