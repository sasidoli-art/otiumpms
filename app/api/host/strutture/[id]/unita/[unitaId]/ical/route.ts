/**
 * GET /api/host/strutture/[id]/unita/[unitaId]/ical?token=<icalToken>
 *
 * Esporta il calendario iCal di una singola unità prenotabile.
 * Token basato su unitaId — ogni unità ha il suo link iCal indipendente.
 *
 * Uso tipico: collegare singole camere/slot a Booking.com per la sync granulare.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyIcalToken, buildCalendar, prenotazioniToEvents, generateIcalToken } from '@/lib/ical'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; unitaId: string }> },
) {
  const params = await paramsPromise

  const ip = getClientIp(req)
  const rl = rateLimit(`ical:unita:${ip}`, { windowMs: 60 * 60 * 1000, max: 60 })
  if (!rl.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter) },
    })
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token || !verifyIcalToken(token, params.unitaId)) {
    logger.warn('iCal: token non valido per unità', 'ical/unita', {
      strutturaId: params.id,
      unitaId: params.unitaId,
      ip,
    })
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const unita = await prisma.unitaPrenotabile.findFirst({
    where: {
      id: params.unitaId,
      strutturaId: params.id,
      attiva: true,
    },
    select: {
      id: true,
      nome: true,
      struttura: { select: { nome: true, citta: true } },
      prenotazioni: {
        where: {
          stato: { notIn: ['ANNULLATA', 'NO_SHOW'] },
        },
        select: {
          id: true,
          dataArrivo: true,
          dataPartenza: true,
          stato: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!unita) return new NextResponse('Not Found', { status: 404 })

  const events = prenotazioniToEvents(unita.prenotazioni)

  const calName = `${unita.struttura.nome} — ${unita.nome}`
  const calendar = buildCalendar({
    calName,
    calDescription: `Calendario ${calName}${unita.struttura.citta ? ` · ${unita.struttura.citta}` : ''} · otiumweek.it`,
    events,
  })

  return new NextResponse(calendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${unita.nome.replace(/[^a-z0-9]/gi, '_')}.ics"`,
      'Cache-Control': 'public, max-age=14400',
    },
  })
}

export function getUnitaIcalUrl(strutturaId: string, unitaId: string, baseUrl: string): string {
  const token = generateIcalToken(unitaId)
  return `${baseUrl}/api/host/strutture/${strutturaId}/unita/${unitaId}/ical?token=${token}`
}
