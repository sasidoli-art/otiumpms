import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { z } from 'zod'
import { applySecretUpdate, maskSecret, isMasked } from '@/lib/secrets'
import { audit } from '@/lib/audit'

const canaliSchema = z.object({
  smtpHost: z.string().max(255).trim().optional().nullable(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  smtpUser: z.string().max(254).trim().optional().nullable(),
  smtpPass: z.string().max(512).optional().nullable(),
  emailMittente: z.string().max(320).trim().optional().nullable(),
})

// GET /api/admin/hosts/[id]/canali
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await params
  const host = await prisma.host.findUnique({
    where: { id },
    select: {
      id: true,
      nomeAzienda: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      smtpPass: true,
      emailMittente: true,
    },
  })

  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  return NextResponse.json({ ...host, smtpPass: maskSecret(host.smtpPass) })
}

// PATCH /api/admin/hosts/[id]/canali
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await params

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = canaliSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dati non validi' }, { status: 422 })
  }

  const data = parsed.data

  const host = await prisma.host.findUnique({ where: { id } })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const updated = await prisma.host.update({
    where: { id },
    data: {
      smtpHost: data.smtpHost !== undefined ? (data.smtpHost || null) : host.smtpHost,
      smtpPort: data.smtpPort !== undefined ? (data.smtpPort ?? null) : host.smtpPort,
      smtpUser: data.smtpUser !== undefined ? (data.smtpUser || null) : host.smtpUser,
      smtpPass: applySecretUpdate(data.smtpPass, host.smtpPass),
      emailMittente: data.emailMittente !== undefined ? (data.emailMittente || null) : host.emailMittente,
    },
    select: {
      id: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      smtpPass: true,
      emailMittente: true,
    },
  })

  if (data.smtpPass !== undefined && data.smtpPass !== null && !isMasked(data.smtpPass)) {
    await audit({
      hostId: id,
      userId: auth.user.id,
      userEmail: auth.user.email,
      azione: 'host.secret.updated',
      entita: 'host',
      entitaId: id,
      dettagli: 'Secret updated: smtpPass',
    })
  }

  return NextResponse.json({ ...updated, smtpPass: maskSecret(updated.smtpPass) })
}
