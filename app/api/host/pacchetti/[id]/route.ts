import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

const pachettoUpdateSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  descrizione: z.string().optional(),
  immagine: z.string().optional(),
  eventoId: z.string().nullable().optional(),
  eventoEsterno: z.string().nullable().optional(),
  notti: z.coerce.number().int().min(1).optional(),
  numOspiti: z.coerce.number().int().min(1).optional(),
  prezzo: z.coerce.number().min(0).optional(),
  prezzoOriginale: z.coerce.number().min(0).nullable().optional(),
  incluso: z.array(z.string()).optional(),
  attivo: z.boolean().optional(),
  dataInizio: z.string().nullable().optional(),
  dataFine: z.string().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const pacchetto = await prisma.pacchetto.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
    include: {
      struttura: { select: { id: true, nome: true } },
      evento: { select: { id: true, titolo: true, dataInizio: true, citta: true } },
    },
  })

  if (!pacchetto) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(pacchetto)
}

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.pacchetto.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const raw = await req.json()
  const { data, error } = parseBody(pachettoUpdateSchema, raw)
  if (error) return error

  const updated = await prisma.pacchetto.update({
    where: { id: params.id },
    data: {
      ...data,
      dataInizio: data.dataInizio !== undefined
        ? (data.dataInizio ? new Date(data.dataInizio) : null)
        : undefined,
      dataFine: data.dataFine !== undefined
        ? (data.dataFine ? new Date(data.dataFine) : null)
        : undefined,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.pacchetto.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.pacchetto.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
