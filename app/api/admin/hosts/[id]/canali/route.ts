import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { z } from 'zod'
import { maskSecret, isMasked } from '@/lib/secrets'
import { getSmtpConfig, setSmtpConfig } from '@/lib/host-config'
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
  const [host, smtp] = await Promise.all([
    prisma.host.findUnique({ where: { id }, select: { id: true, nomeAzienda: true } }),
    getSmtpConfig(id),
  ])

  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  return NextResponse.json({
    id: host.id,
    nomeAzienda: host.nomeAzienda,
    smtpHost: smtp?.smtpHost ?? null,
    smtpPort: smtp?.smtpPort ?? null,
    smtpUser: smtp?.smtpUser ?? null,
    smtpPass: maskSecret(smtp?.smtpPass ?? null),
    emailMittente: smtp?.emailMittente ?? null,
  })
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

  const exists = await prisma.host.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const patch: Record<string, unknown> = {}
  if (data.smtpHost !== undefined) patch.smtpHost = data.smtpHost || null
  if (data.smtpPort !== undefined) patch.smtpPort = data.smtpPort ?? null
  if (data.smtpUser !== undefined) patch.smtpUser = data.smtpUser || null
  if (data.smtpPass !== undefined) patch.smtpPass = data.smtpPass
  if (data.emailMittente !== undefined) patch.emailMittente = data.emailMittente || null

  if (Object.keys(patch).length > 0) {
    await setSmtpConfig(id, patch)
  }

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

  const updated = await getSmtpConfig(id)
  return NextResponse.json({
    id,
    smtpHost: updated?.smtpHost ?? null,
    smtpPort: updated?.smtpPort ?? null,
    smtpUser: updated?.smtpUser ?? null,
    smtpPass: maskSecret(updated?.smtpPass ?? null),
    emailMittente: updated?.emailMittente ?? null,
  })
}
