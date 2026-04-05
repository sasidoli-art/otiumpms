import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

const REPARTI = ['RECEPTION', 'HOUSEKEEPING', 'MANUTENZIONE', 'SPA', 'RISTORANTE', 'DIREZIONE', 'ALTRO'] as const
const TRIGGER_EVENTI = ['CHECKIN', 'CHECKOUT', 'ARRIVO_GIORNO'] as const

const traceSchema = z.object({
  titolo: z.string().min(1, 'Titolo obbligatorio').max(200),
  descrizione: z.string().max(2000).optional().nullable(),
  reparto: z.enum(REPARTI),
  priorita: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).default('NORMALE'),
  prenotazioneId: z.string().cuid().optional().nullable(),
  dataScadenza: z.string().optional().nullable(),
  oraScadenza: z.string().max(5).optional().nullable(),
  assegnatoA: z.string().max(100).optional().nullable(),
  triggerEvento: z.enum(TRIGGER_EVENTI).optional().nullable(),
})

/**
 * GET /api/host/traces?stato=APERTO&reparto=RECEPTION&prenotazioneId=xxx&oggi=true
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const stato = sp.get('stato')
  const reparto = sp.get('reparto')
  const prenotazioneId = sp.get('prenotazioneId')
  const oggi = sp.get('oggi') === 'true'
  const limit = Math.min(parseInt(sp.get('limit') ?? '100'), 500)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const where = {
    hostId: auth.user.hostId,
    ...(stato ? { stato: stato as 'APERTO' | 'IN_CORSO' | 'COMPLETATO' | 'ANNULLATO' } : {}),
    ...(reparto ? { reparto } : {}),
    ...(prenotazioneId ? { prenotazioneId } : {}),
    ...(oggi ? { dataScadenza: { gte: todayStart, lte: todayEnd } } : {}),
  }

  const [traces, totale] = await Promise.all([
    prisma.trace.findMany({
      where,
      include: {
        prenotazione: {
          select: { id: true, guestNome: true, guestCognome: true, dataArrivo: true, stato: true, unita: { select: { nome: true } } },
        },
      },
      orderBy: [{ priorita: 'desc' }, { dataScadenza: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    }),
    prisma.trace.count({ where }),
  ])

  // KPI rapidi
  const kpi = await prisma.trace.groupBy({
    by: ['stato'],
    where: { hostId: auth.user.hostId },
    _count: true,
  })

  const scadutiOggi = await prisma.trace.count({
    where: {
      hostId: auth.user.hostId,
      stato: { in: ['APERTO', 'IN_CORSO'] },
      dataScadenza: { lte: todayEnd },
    },
  })

  return NextResponse.json({
    traces,
    totale,
    kpi: {
      aperti: kpi.find(k => k.stato === 'APERTO')?._count ?? 0,
      inCorso: kpi.find(k => k.stato === 'IN_CORSO')?._count ?? 0,
      completati: kpi.find(k => k.stato === 'COMPLETATO')?._count ?? 0,
      scadutiOggi,
    },
  })
}

/**
 * POST /api/host/traces — crea nuovo promemoria
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(traceSchema, await req.json())
  if (parsed.error) return parsed.error

  const { dataScadenza, ...rest } = parsed.data

  const trace = await prisma.trace.create({
    data: {
      hostId: auth.user.hostId,
      ...rest,
      dataScadenza: dataScadenza ? new Date(dataScadenza) : null,
      creatoDa: auth.user.name || auth.user.email,
    },
    include: {
      prenotazione: {
        select: { id: true, guestNome: true, guestCognome: true },
      },
    },
  })

  return NextResponse.json(trace, { status: 201 })
}
