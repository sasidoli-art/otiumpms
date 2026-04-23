import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

const patchSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  descrizione: z.string().max(2000).nullable().optional(),
  immagine: z.string().url().nullable().optional(),
  costoInPunti: z.number().int().min(1).optional(),
  attivo: z.boolean().optional(),
  disponibilitaMax: z.number().int().min(1).nullable().optional(),
  disponibilitaMembro: z.number().int().min(1).nullable().optional(),
  trattamentoSpaId: z.string().nullable().optional(),
  datiApplicazione: z.record(z.unknown()).nullable().optional(),
})

async function ownPremio(hostId: string, id: string) {
  return prisma.premioFedelta.findFirst({
    where: { id, programma: { hostId } },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const owned = await ownPremio(auth.user.hostId, id)
  if (!owned) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }

  const { datiApplicazione, ...rest } = parsed.data
  const data: Prisma.PremioFedeltaUpdateInput = { ...rest }
  if (datiApplicazione !== undefined) {
    data.datiApplicazione = datiApplicazione === null
      ? Prisma.JsonNull
      : (datiApplicazione as Prisma.InputJsonValue)
  }

  const updated = await prisma.premioFedelta.update({ where: { id }, data })

  await auditFromAuth(auth, {
    azione: 'loyalty.premio_aggiornato',
    entita: 'PremioFedelta',
    entitaId: id,
    dettagli: `Aggiornati ${Object.keys(parsed.data).length} campi`,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const owned = await ownPremio(auth.user.hostId, id)
  if (!owned) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Soft-approach: se ci sono riscatti storici, disattivo invece di cancellare
  const hasRiscatti = await prisma.movimentoPunti.count({ where: { premioId: id } })
  if (hasRiscatti > 0) {
    await prisma.premioFedelta.update({ where: { id }, data: { attivo: false } })
    return NextResponse.json({ ok: true, disattivato: true, riscattiStorici: hasRiscatti })
  }

  await prisma.premioFedelta.delete({ where: { id } })
  await auditFromAuth(auth, {
    azione: 'loyalty.premio_eliminato',
    entita: 'PremioFedelta',
    entitaId: id,
    dettagli: `Eliminato "${owned.nome}"`,
  })
  return NextResponse.json({ ok: true })
}
