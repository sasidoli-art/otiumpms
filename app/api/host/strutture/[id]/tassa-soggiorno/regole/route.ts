import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

// GET /api/host/strutture/[id]/tassa-soggiorno/regole — lista regole
export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const regole = await prisma.regolaTassaSoggiorno.findMany({
    where: { strutturaId: params.id },
    orderBy: { ordine: 'asc' },
  })

  return NextResponse.json(regole)
}

// POST /api/host/strutture/[id]/tassa-soggiorno/regole — crea regola
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })
  const importo = Number(body.importoNotte)
  if (!isFinite(importo) || importo < 0) {
    return NextResponse.json({ error: 'Importo non valido' }, { status: 400 })
  }

  // Cap automatici sensati (validazione difensiva, non bug-prevention paranoica)
  if (body.etaMinimaApplicazione != null && (body.etaMinimaApplicazione < 0 || body.etaMinimaApplicazione > 25)) {
    return NextResponse.json({ error: 'Età minima fuori range 0-25' }, { status: 400 })
  }
  if (body.maxNottiConsecutive != null && (body.maxNottiConsecutive < 1 || body.maxNottiConsecutive > 365)) {
    return NextResponse.json({ error: 'Cap notti fuori range 1-365' }, { status: 400 })
  }

  const maxOrdine = await prisma.regolaTassaSoggiorno.aggregate({
    where: { strutturaId: params.id },
    _max: { ordine: true },
  })

  const regola = await prisma.regolaTassaSoggiorno.create({
    data: {
      strutturaId: params.id,
      nome: body.nome.trim(),
      importoNotte: importo,
      dataInizio: body.dataInizio ? new Date(body.dataInizio) : null,
      dataFine: body.dataFine ? new Date(body.dataFine) : null,
      ricorrenteAnnuale: body.ricorrenteAnnuale ?? true,
      etaMinimaApplicazione: body.etaMinimaApplicazione ?? null,
      maxNottiConsecutive: body.maxNottiConsecutive ?? null,
      attiva: body.attiva ?? true,
      ordine: (maxOrdine._max.ordine ?? -1) + 1,
    },
  })

  return NextResponse.json(regola, { status: 201 })
}
