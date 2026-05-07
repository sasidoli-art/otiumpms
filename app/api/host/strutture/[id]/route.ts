import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

// GET /api/host/strutture/[id]
export async function GET(_: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
    include: {
      unita: {
        include: {
          tariffe: { orderBy: { dataInizio: 'asc' } },
          _count: { select: { disponibilita: true } },
        },
        orderBy: { nome: 'asc' },
      },
    },
  })

  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(struttura)
}

// PATCH /api/host/strutture/[id]
export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const struttura = await prisma.struttura.update({
    where: { id: params.id },
    data: {
      nome: body.nome ?? existing.nome,
      tipo: body.tipo ?? existing.tipo,
      descrizione: body.descrizione ?? existing.descrizione,
      indirizzo: body.indirizzo ?? existing.indirizzo,
      citta: body.citta ?? existing.citta,
      regione: body.regione ?? existing.regione,
      capacitaTotale: body.capacitaTotale != null ? Number(body.capacitaTotale) : existing.capacitaTotale,
      prezzoBase: body.prezzoBase != null ? Number(body.prezzoBase) : existing.prezzoBase,
      attiva: body.attiva ?? existing.attiva,
      immagini: body.immagini ?? existing.immagini,
    },
  })

  return NextResponse.json(struttura)
}

// DELETE /api/host/strutture/[id]
export async function DELETE(_: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.struttura.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
