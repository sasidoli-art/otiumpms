import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiKey, isApiKeyUnauthorized } from '@/lib/api-key'

// GET /api/v1/prenotazioni?stato=&dal=&al=&limit=
// Lista prenotazioni per integrazioni 3rd-party. Auth: X-API-Key.
// Scope richiesto: "prenotazioni:read"
export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req, 'prenotazioni:read')
  if (isApiKeyUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const dal = searchParams.get('dal')
  const al = searchParams.get('al')
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))

  const where: Record<string, unknown> = { hostId: auth.hostId, deletedAt: null }
  if (stato) where.stato = stato
  if (dal || al) {
    const range: Record<string, Date> = {}
    if (dal) range.gte = new Date(dal)
    if (al) range.lte = new Date(al)
    where.dataArrivo = range
  }

  const prenotazioni = await prisma.prenotazione.findMany({
    where,
    take: limit,
    orderBy: { dataArrivo: 'desc' },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      dataArrivo: true,
      dataPartenza: true,
      stato: true,
      numOspiti: true,
      prezzoTotale: true,
      struttura: { select: { nome: true } },
      unita: { select: { nome: true } },
    },
  })

  return NextResponse.json({
    data: prenotazioni.map((p) => ({
      id: p.id,
      guest: { nome: p.guestNome, cognome: p.guestCognome, email: p.guestEmail },
      dataArrivo: p.dataArrivo,
      dataPartenza: p.dataPartenza,
      stato: p.stato,
      numOspiti: p.numOspiti,
      prezzoTotale: p.prezzoTotale,
      struttura: p.struttura?.nome ?? null,
      unita: p.unita?.nome ?? null,
    })),
    count: prenotazioni.length,
  })
}
