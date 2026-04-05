import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * PATCH /api/host/traces/[id] — aggiorna stato, assegnazione, risoluzione
 */
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const trace = await prisma.trace.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!trace) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const { stato, assegnatoA, noteRisoluzione, priorita, titolo, descrizione, reparto, dataScadenza, oraScadenza } = body

  const data: Record<string, unknown> = {}
  if (stato !== undefined) data.stato = stato
  if (assegnatoA !== undefined) data.assegnatoA = assegnatoA
  if (noteRisoluzione !== undefined) data.noteRisoluzione = noteRisoluzione
  if (priorita !== undefined) data.priorita = priorita
  if (titolo !== undefined) data.titolo = titolo
  if (descrizione !== undefined) data.descrizione = descrizione
  if (reparto !== undefined) data.reparto = reparto
  if (dataScadenza !== undefined) data.dataScadenza = dataScadenza ? new Date(dataScadenza) : null
  if (oraScadenza !== undefined) data.oraScadenza = oraScadenza

  // Se marcato come completato, registra chi e quando
  if (stato === 'COMPLETATO') {
    data.completatoAt = new Date()
    data.completatoDa = auth.user.name || auth.user.email
  }

  const updated = await prisma.trace.update({
    where: { id },
    data,
    include: {
      prenotazione: {
        select: { id: true, guestNome: true, guestCognome: true },
      },
    },
  })

  return NextResponse.json(updated)
}

/**
 * DELETE /api/host/traces/[id]
 */
export async function DELETE(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const trace = await prisma.trace.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!trace) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.trace.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
