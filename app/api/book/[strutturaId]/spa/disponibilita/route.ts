import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcolaSlotSpa } from '@/lib/spa-availability'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/book/[strutturaId]/spa/disponibilita
 * Query: ?data=YYYY-MM-DD&trattamentoId=xxx|&durata=60
 * Rate: 60/min (public:search)
 *
 * Ritorna slot disponibili calcolati da lib/spa-availability.ts.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ strutturaId: string }> },
) {
  const blocked = checkRateLimit(req, 'public:search')
  if (blocked) return blocked

  const { strutturaId } = await params
  const sp = req.nextUrl.searchParams
  const dataStr = sp.get('data')
  const trattamentoId = sp.get('trattamentoId')
  const percorsoId = sp.get('percorsoId')
  const durataParam = sp.get('durata')

  if (!dataStr) {
    return NextResponse.json({ error: 'Parametro data obbligatorio' }, { status: 400 })
  }

  const dataTarget = new Date(dataStr + 'T00:00:00')
  if (isNaN(dataTarget.getTime())) {
    return NextResponse.json({ error: 'Data non valida' }, { status: 400 })
  }

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  if (dataTarget < oggi) {
    return NextResponse.json({ error: 'Data nel passato' }, { status: 400 })
  }

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: { hostId: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  // Determina durata: da trattamentoId, percorsoId o parametro esplicito
  let durata = durataParam ? parseInt(durataParam) : 60
  if (trattamentoId) {
    const t = await prisma.trattamentoSpa.findFirst({
      where: { id: trattamentoId, hostId: struttura.hostId, attivo: true },
      select: { durata: true },
    })
    if (!t) return NextResponse.json({ error: 'Trattamento non trovato' }, { status: 404 })
    durata = t.durata
  } else if (percorsoId) {
    const p = await prisma.percorsoBenessere.findFirst({
      where: { id: percorsoId, hostId: struttura.hostId, attivo: true },
      select: { durataMinuti: true },
    })
    if (!p) return NextResponse.json({ error: 'Percorso non trovato' }, { status: 404 })
    durata = p.durataMinuti
  }

  if (isNaN(durata) || durata < 15 || durata > 480) {
    return NextResponse.json({ error: 'Durata non valida (15-480 min)' }, { status: 400 })
  }

  const slots = await calcolaSlotSpa({
    hostId: struttura.hostId,
    data: dataTarget,
    durata,
  })

  return NextResponse.json({
    data: dataStr,
    durata,
    slots,
  })
}
