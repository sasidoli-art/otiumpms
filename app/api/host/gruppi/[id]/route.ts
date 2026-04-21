import { z } from 'zod'
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'

// GET /api/host/gruppi/[id]
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const gruppo = await prisma.gruppoPrenotazione.findFirst({
    where: { id, hostId: auth.user.hostId, deletedAt: null },
    include: {
      prenotazioni: {
        select: {
          id: true, guestNome: true, guestCognome: true, guestEmail: true,
          dataArrivo: true, dataPartenza: true, numOspiti: true,
          stato: true, prezzoTotale: true,
          unita: { select: { nome: true } },
        },
        orderBy: { dataArrivo: 'asc' },
      },
    },
  })
  if (!gruppo) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(gruppo)
}

// PATCH /api/host/gruppi/[id]
const updateSchema = z.object({
  nome: z.string().optional(),
  referenteNome: z.string().optional(),
  referenteCognome: z.string().optional(),
  referenteEmail: z.string().email().optional(),
  referenteTelefono: z.string().nullable().optional(),
  numOspitiTotali: z.number().int().optional(),
  prezzoTotale: z.number().nullable().optional(),
  scontoPercent: z.number().min(0).max(100).nullable().optional(),
  note: z.string().nullable().optional(),
  eventoEsterno: z.string().nullable().optional(),
  // Operazioni sui membri
  addPrenotazioneIds: z.array(z.string()).optional(),
  removePrenotazioneIds: z.array(z.string()).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const gruppo = await prisma.gruppoPrenotazione.findFirst({
    where: { id, hostId: auth.user.hostId, deletedAt: null },
  })
  if (!gruppo) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const raw = await req.json()
  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }
  const d = parsed.data

  await prisma.$transaction(async (tx) => {
    // Update campi gruppo
    const dataUpdate: Record<string, unknown> = {}
    if (d.nome !== undefined) dataUpdate.nome = d.nome
    if (d.referenteNome !== undefined) dataUpdate.referenteNome = d.referenteNome
    if (d.referenteCognome !== undefined) dataUpdate.referenteCognome = d.referenteCognome
    if (d.referenteEmail !== undefined) dataUpdate.referenteEmail = d.referenteEmail
    if (d.referenteTelefono !== undefined) dataUpdate.referenteTelefono = d.referenteTelefono
    if (d.numOspitiTotali !== undefined) dataUpdate.numOspitiTotali = d.numOspitiTotali
    if (d.prezzoTotale !== undefined) dataUpdate.prezzoTotale = d.prezzoTotale
    if (d.scontoPercent !== undefined) dataUpdate.scontoPercent = d.scontoPercent
    if (d.note !== undefined) dataUpdate.note = d.note
    if (d.eventoEsterno !== undefined) dataUpdate.eventoEsterno = d.eventoEsterno

    if (Object.keys(dataUpdate).length > 0) {
      await tx.gruppoPrenotazione.update({ where: { id }, data: dataUpdate })
    }

    if (d.addPrenotazioneIds?.length) {
      await tx.prenotazione.updateMany({
        where: { id: { in: d.addPrenotazioneIds }, hostId: auth.user.hostId },
        data: { gruppoPrenotazioneId: id },
      })
    }
    if (d.removePrenotazioneIds?.length) {
      await tx.prenotazione.updateMany({
        where: { id: { in: d.removePrenotazioneIds }, gruppoPrenotazioneId: id },
        data: { gruppoPrenotazioneId: null },
      })
    }
  })

  await auditFromAuth(auth, {
    azione: 'gruppo.aggiornato',
    entita: 'gruppoPrenotazione',
    entitaId: id,
    dettagli: `Gruppo ${gruppo.nome} aggiornato`,
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/host/gruppi/[id] — soft delete, scollega prenotazioni
export async function DELETE(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const gruppo = await prisma.gruppoPrenotazione.findFirst({
    where: { id, hostId: auth.user.hostId, deletedAt: null },
  })
  if (!gruppo) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.$transaction([
    prisma.prenotazione.updateMany({
      where: { gruppoPrenotazioneId: id },
      data: { gruppoPrenotazioneId: null },
    }),
    prisma.gruppoPrenotazione.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ])

  await auditFromAuth(auth, {
    azione: 'gruppo.eliminato',
    entita: 'gruppoPrenotazione',
    entitaId: id,
    dettagli: `Gruppo ${gruppo.nome} eliminato (prenotazioni scollegate)`,
  })

  return NextResponse.json({ ok: true })
}
