import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { calcolaBiancheria } from '@/lib/biancheria'
import { addDays } from 'date-fns'

/**
 * GET /api/host/biancheria?data=2026-04-01
 * Calcola biancheria necessaria per una data (default: domani).
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const dataStr = req.nextUrl.searchParams.get('data')
  const data = dataStr ? new Date(dataStr + 'T12:00') : addDays(new Date(), 1)

  const riepilogo = await calcolaBiancheria(auth.user.hostId, data)

  // Richieste già generate per questa data
  const richiesteEsistenti = await prisma.richiestaBiancheria.findMany({
    where: { hostId: auth.user.hostId, dataConsegna: new Date(riepilogo.dataConsegna) },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ ...riepilogo, richiesteEsistenti })
}

/**
 * POST /api/host/biancheria
 * Genera e salva una richiesta biancheria.
 * Body: { data?: string, note?: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const dataStr = body.data
  const data = dataStr ? new Date(dataStr + 'T12:00') : addDays(new Date(), 1)

  const riepilogo = await calcolaBiancheria(auth.user.hostId, data)

  if (riepilogo.righe.length === 0) {
    return NextResponse.json({ error: 'Nessun arrivo per questa data' }, { status: 400 })
  }

  const richiesta = await prisma.richiestaBiancheria.create({
    data: {
      hostId: auth.user.hostId,
      dataConsegna: new Date(riepilogo.dataConsegna),
      righe: riepilogo.righe as object[],
      totaleArticoli: riepilogo.totaleArticoli,
      totaleCamere: riepilogo.totaleCamere,
      note: body.note || null,
    },
  })

  return NextResponse.json(richiesta, { status: 201 })
}
