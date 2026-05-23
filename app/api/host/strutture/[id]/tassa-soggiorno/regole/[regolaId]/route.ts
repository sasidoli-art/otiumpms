import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

type RouteParams = Promise<{ id: string; regolaId: string }>

async function load(id: string, regolaId: string, hostId: string) {
  const struttura = await prisma.struttura.findFirst({ where: { id, hostId } })
  if (!struttura) return { error: NextResponse.json({ error: 'Non trovato' }, { status: 404 }) }
  const regola = await prisma.regolaTassaSoggiorno.findFirst({
    where: { id: regolaId, strutturaId: id },
  })
  if (!regola) return { error: NextResponse.json({ error: 'Regola non trovata' }, { status: 404 }) }
  return { regola }
}

// PATCH /api/host/strutture/[id]/tassa-soggiorno/regole/[regolaId]
export async function PATCH(req: NextRequest, { params }: { params: RouteParams }) {
  const { id, regolaId } = await params
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const r = await load(id, regolaId, auth.user.hostId)
  if (r.error) return r.error

  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}

  if ('nome' in body) {
    if (!String(body.nome).trim()) {
      return NextResponse.json({ error: 'Nome non può essere vuoto' }, { status: 400 })
    }
    data.nome = body.nome.trim()
  }
  if ('importoNotte' in body) {
    const n = Number(body.importoNotte)
    if (!isFinite(n) || n < 0) {
      return NextResponse.json({ error: 'Importo non valido' }, { status: 400 })
    }
    data.importoNotte = n
  }
  if ('dataInizio' in body) data.dataInizio = body.dataInizio ? new Date(body.dataInizio) : null
  if ('dataFine' in body) data.dataFine = body.dataFine ? new Date(body.dataFine) : null
  if ('ricorrenteAnnuale' in body) data.ricorrenteAnnuale = !!body.ricorrenteAnnuale
  if ('etaMinimaApplicazione' in body) data.etaMinimaApplicazione = body.etaMinimaApplicazione ?? null
  if ('maxNottiConsecutive' in body) data.maxNottiConsecutive = body.maxNottiConsecutive ?? null
  if ('attiva' in body) data.attiva = !!body.attiva
  if ('ordine' in body) data.ordine = Number(body.ordine)

  const updated = await prisma.regolaTassaSoggiorno.update({
    where: { id: regolaId },
    data,
  })
  return NextResponse.json(updated)
}

// DELETE /api/host/strutture/[id]/tassa-soggiorno/regole/[regolaId]
export async function DELETE(_req: NextRequest, { params }: { params: RouteParams }) {
  const { id, regolaId } = await params
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const r = await load(id, regolaId, auth.user.hostId)
  if (r.error) return r.error

  await prisma.regolaTassaSoggiorno.delete({ where: { id: regolaId } })
  return NextResponse.json({ ok: true })
}
