import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

type RouteParams = { params: Promise<{ id: string }> }

// ─── GET: fattura detail ─────────────────────────────────────────────────────

export async function GET(
  _: NextRequest,
  { params: paramsPromise }: RouteParams,
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const fattura = await prisma.fattura.findFirst({
    where: { id, hostId: auth.user.hostId },
    include: {
      prenotazioni: {
        select: {
          id: true,
          guestNome: true,
          guestCognome: true,
          guestEmail: true,
          dataArrivo: true,
          dataPartenza: true,
          prezzoTotale: true,
        },
      },
      riferimentoFattura: {
        select: { id: true, numero: true },
      },
      noteDiCredito: {
        select: { id: true, numero: true, totale: true, stato: true },
      },
    },
  })

  if (!fattura) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  return NextResponse.json(fattura)
}

// ─── PATCH: update fattura ───────────────────────────────────────────────────

const updateSchema = z.object({
  stato: z.enum(['BOZZA', 'INVIATA', 'PAGATA', 'SCADUTA', 'ANNULLATA', 'STORNATA']).optional(),
  note: z.string().optional().nullable(),
  dataScadenza: z.string().optional().nullable(),
  clienteNome: z.string().min(1).optional(),
  clientePIva: z.string().optional().nullable(),
  clienteCF: z.string().optional().nullable(),
  clienteIndirizzo: z.string().optional().nullable(),
  clienteCitta: z.string().optional().nullable(),
  clienteCap: z.string().optional().nullable(),
  clienteProvincia: z.string().optional().nullable(),
  clienteEmail: z.string().email().optional().nullable(),
  clientePec: z.string().optional().nullable(),
  clienteSDI: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: RouteParams,
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const parsed = parseBody(updateSchema, await req.json())
  if (parsed.error) return parsed.error

  // Verify ownership
  const existing = await prisma.fattura.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true, stato: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  // Build update data, filtering out undefined values
  const updateData: Record<string, unknown> = {}
  const d = parsed.data
  if (d.stato !== undefined) updateData.stato = d.stato
  if (d.note !== undefined) updateData.note = d.note
  if (d.dataScadenza !== undefined) {
    updateData.dataScadenza = d.dataScadenza ? new Date(d.dataScadenza) : null
  }
  if (d.clienteNome !== undefined) updateData.clienteNome = d.clienteNome
  if (d.clientePIva !== undefined) updateData.clientePIva = d.clientePIva
  if (d.clienteCF !== undefined) updateData.clienteCF = d.clienteCF
  if (d.clienteIndirizzo !== undefined) updateData.clienteIndirizzo = d.clienteIndirizzo
  if (d.clienteCitta !== undefined) updateData.clienteCitta = d.clienteCitta
  if (d.clienteCap !== undefined) updateData.clienteCap = d.clienteCap
  if (d.clienteProvincia !== undefined) updateData.clienteProvincia = d.clienteProvincia
  if (d.clienteEmail !== undefined) updateData.clienteEmail = d.clienteEmail
  if (d.clientePec !== undefined) updateData.clientePec = d.clientePec
  if (d.clienteSDI !== undefined) updateData.clienteSDI = d.clienteSDI

  const fattura = await prisma.fattura.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(fattura)
}

// ─── DELETE: only if BOZZA ───────────────────────────────────────────────────

export async function DELETE(
  _: NextRequest,
  { params: paramsPromise }: RouteParams,
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const fattura = await prisma.fattura.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true, stato: true },
  })

  if (!fattura) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  if (fattura.stato !== 'BOZZA') {
    return NextResponse.json(
      { error: 'Solo le fatture in BOZZA possono essere eliminate' },
      { status: 422 },
    )
  }

  // Disconnect prenotazioni before soft delete
  await prisma.prenotazione.updateMany({
    where: { fatturaId: id },
    data: { fatturaId: null },
  })

  // Soft delete: il record resta per audit/archivio, viene escluso dalle liste
  await prisma.fattura.update({ where: { id }, data: { deletedAt: new Date() } })

  return NextResponse.json({ ok: true })
}
