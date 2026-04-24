import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/host/ristorazione/prenotazioni?data=YYYY-MM-DD
 *
 * Lista prenotazioni ristorante per il giorno richiesto (default: oggi).
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { hostId } = auth.user

  const url = new URL(req.url)
  const dataParam = url.searchParams.get('data')
  const ymd = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : null

  const giorno = ymd ? parseYMD(ymd) : startOfToday()
  const giornoDopo = new Date(giorno)
  giornoDopo.setDate(giornoDopo.getDate() + 1)

  const prenotazioni = await prisma.prenotazioneRistorante.findMany({
    where: {
      hostId,
      dataOra: { gte: giorno, lt: giornoDopo },
    },
    orderBy: { dataOra: 'asc' },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      guestTelefono: true,
      dataOra: true,
      numPersone: true,
      note: true,
      stato: true,
      prenotazioneId: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    data: ymdFromDate(giorno),
    prenotazioni,
  })
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}
function ymdFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
