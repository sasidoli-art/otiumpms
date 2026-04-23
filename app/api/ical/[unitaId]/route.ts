import { NextRequest, NextResponse } from 'next/server'
import { verifyIcalToken } from '@/lib/ical'
import { generaFeedICal } from '@/lib/ical-export'
import { logger } from '@/lib/logger'

/**
 * GET /api/ical/[unitaId]?token=xxx&escludiCanale=yyy
 *
 * Feed iCal pubblico per una camera — consumato dagli OTA (Booking, Airbnb, ...).
 * Autenticazione via token HMAC (deterministico su `unitaId`).
 *
 * Response: `Content-Type: text/calendar`, cache 15 min.
 * In caso di token mancante/errato: 401 testo piano (così gli OTA vedono l'errore nei log).
 */
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ unitaId: string }> },
) {
  const { unitaId } = await paramsPromise
  const token = req.nextUrl.searchParams.get('token') ?? ''
  const escludiCanale = req.nextUrl.searchParams.get('escludiCanale') ?? undefined

  if (!token || !verifyIcalToken(token, unitaId)) {
    return new NextResponse('Unauthorized: invalid or missing iCal token', {
      status: 401,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const result = await generaFeedICal(unitaId, escludiCanale)
  if (!result.ok) {
    logger.warn('iCal export failed', { unitaId, reason: result.error })
    return new NextResponse(`Not found: ${result.error}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new NextResponse(result.ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${result.unitaNome.replace(/[^\w-]/g, '_')}.ics"`,
      'Cache-Control': 'public, max-age=900, s-maxage=900',
    },
  })
}
