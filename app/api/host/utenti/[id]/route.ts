import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

// ─── PATCH: Update staff member role or active status ────────────────────────

const patchSchema = z.object({
  ruolo: z
    .enum([
      'MANAGER',
      'RECEPTIONIST',
      'HOUSEKEEPING',
      'SPA_OPERATOR',
      'RESTAURANT',
      'CONCIERGE',
      'READONLY',
    ])
    .optional(),
  attivo: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await params

  // Verify member belongs to this host
  const member = await prisma.staffMember.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!member) {
    return NextResponse.json({ error: 'Membro staff non trovato' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 422 },
    )
  }

  const { ruolo, attivo } = parsed.data
  if (ruolo === undefined && attivo === undefined) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  const updated = await prisma.staffMember.update({
    where: { id },
    data: {
      ...(ruolo !== undefined && { ruolo }),
      ...(attivo !== undefined && { attivo }),
    },
    include: {
      user: {
        select: { id: true, nome: true, cognome: true, email: true },
      },
    },
  })

  return NextResponse.json(updated)
}

// ─── DELETE: Remove staff member ─────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await params

  // Verify member belongs to this host
  const member = await prisma.staffMember.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!member) {
    return NextResponse.json({ error: 'Membro staff non trovato' }, { status: 404 })
  }

  await prisma.staffMember.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
