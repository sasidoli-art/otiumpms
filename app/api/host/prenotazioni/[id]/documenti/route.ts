import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  fotoDocumentoFronte: z.string().min(1),
  fotoDocumentoRetro: z.string().optional().nullable(),
})

/**
 * POST /api/host/prenotazioni/[id]/documenti
 * Salva le foto documento acquisite dalla reception
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }

  await prisma.prenotazione.update({
    where: { id },
    data: {
      fotoDocumentoFronte: parsed.data.fotoDocumentoFronte,
      fotoDocumentoRetro: parsed.data.fotoDocumentoRetro ?? null,
    },
  })

  return NextResponse.json({ ok: true })
}

/**
 * GET /api/host/prenotazioni/[id]/documenti
 * Controlla se i documenti sono stati acquisiti
 */
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: {
      fotoDocumentoFronte: true,
      fotoDocumentoRetro: true,
    },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  }

  return NextResponse.json({
    frontePresente: !!prenotazione.fotoDocumentoFronte,
    retroPresente: !!prenotazione.fotoDocumentoRetro,
  })
}
