import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/host/crm/[id]  — dettaglio ospite + prenotazioni collegate (by email)
export async function GET(
  _req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth
  const params = await paramsPromise

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!ospite) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Prenotazioni collegate via email
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: auth.user.hostId,
      guestEmail: ospite.email,
    },
    include: {
      unita: { select: { nome: true } },
      struttura: { select: { nome: true } },
    },
    orderBy: { dataArrivo: 'desc' },
    take: 20,
  })

  return NextResponse.json({ ospite, prenotazioni })
}

// PATCH /api/host/crm/[id]
export async function PATCH(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth
  const params = await paramsPromise

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!ospite) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()

  const aggiornato = await prisma.ospiteCRM.update({
    where: { id: params.id },
    data: {
      nome: body.nome ?? ospite.nome,
      cognome: body.cognome ?? ospite.cognome,
      telefono: body.telefono !== undefined ? body.telefono : ospite.telefono,
      nazionalita: body.nazionalita !== undefined ? body.nazionalita : ospite.nazionalita,
      lingua: body.lingua !== undefined ? body.lingua : ospite.lingua,
      note: body.note !== undefined ? body.note : ospite.note,
      preferenze: body.preferenze !== undefined ? body.preferenze : ospite.preferenze,
      vip: body.vip !== undefined ? body.vip : ospite.vip,
      blacklist: body.blacklist !== undefined ? body.blacklist : ospite.blacklist,
      blacklistMotivo: body.blacklistMotivo !== undefined ? body.blacklistMotivo : ospite.blacklistMotivo,
      tags: body.tags !== undefined ? body.tags : ospite.tags,
    },
  })

  return NextResponse.json(aggiornato)
}

// DELETE /api/host/crm/[id]
export async function DELETE(
  _req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth
  const params = await paramsPromise

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!ospite) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.ospiteCRM.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
