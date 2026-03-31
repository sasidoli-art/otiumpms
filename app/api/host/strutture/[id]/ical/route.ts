/**
 * GET /api/host/strutture/[id]/ical?token=<icalToken>
 *
 * Esporta il calendario iCal dell'intera struttura (tutte le unità).
 * L'endpoint è PUBBLICO ma protetto da token HMAC — non richiede sessione.
 * Compatibile con Booking.com, Airbnb, Google Calendar, Apple Calendar.
 *
 * Uso:
 *   Copia il link iCal dalla dashboard struttura e incollalo in Booking.com
 *   → Availability → External Calendar → iCal URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyIcalToken, buildCalendar, prenotazioniToEvents, generateIcalToken } from '@/lib/ical'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise

  // Rate limit: Booking.com fa polling ogni poche ore — 60 req/ora è più che sufficiente
  const ip = getClientIp(req)
  const rl = rateLimit(`ical:struttura:${ip}`, { windowMs: 60 * 60 * 1000, max: 60 })
  if (!rl.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter) },
    })
  }

  // Verifica token HMAC
  const token = req.nextUrl.searchParams.get('token')
  if (!token || !verifyIcalToken(token, params.id)) {
    logger.warn('iCal: token non valido', 'ical/struttura', { strutturaId: params.id, ip })
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const struttura = await prisma.struttura.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      nome: true,
      citta: true,
      attiva: true,
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

  if (!struttura || !struttura.attiva) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const events = prenotazioniToEvents(struttura.prenotazioni)

  const calendar = buildCalendar({
    calName: struttura.nome,
    calDescription: `Calendario disponibilità ${struttura.nome}${struttura.citta ? ` — ${struttura.citta}` : ''} · otiumweek.it`,
    events,
  })

  return new NextResponse(calendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${struttura.nome.replace(/[^a-z0-9]/gi, '_')}.ics"`,
      // Cache: 4 ore (uguale al REFRESH-INTERVAL nel calendario)
      'Cache-Control': 'public, max-age=14400',
    },
  })
}

/**
 * GET /api/host/strutture/[id]/ical?generate=true  (richiede sessione HOST)
 * Usato dalla dashboard per ottenere il link iCal da copiare.
 * Non espone il token direttamente nel frontend — lo genera on-demand.
 */
export { GET as generateToken }

// Helper esportato per le pagine server (calcolato server-side, mai in bundle client)
export function getIcalUrl(strutturaId: string, baseUrl: string): string {
  const token = generateIcalToken(strutturaId)
  return `${baseUrl}/api/host/strutture/${strutturaId}/ical?token=${token}`
}
