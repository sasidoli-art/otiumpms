import { z } from 'zod'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { EMAIL_TEMPLATES } from '@/lib/email-templates'

// GET /api/host/email-automatiche/config
// Ritorna la lista dei template + override dell'host.
export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const configs = await prisma.configEmail.findMany({
    where: { hostId: auth.user.hostId },
  })
  const byTemplateId = new Map(configs.map((c) => [c.templateId, c]))

  const items = EMAIL_TEMPLATES.map((t) => {
    const cfg = byTemplateId.get(t.id)
    return {
      template: t,
      config: cfg ? {
        attiva: cfg.attiva,
        oggettoCustom: cfg.oggettoCustom,
        messaggioCustom: cfg.messaggioCustom,
        ritardoOre: cfg.ritardoOre,
        updatedAt: cfg.updatedAt.toISOString(),
      } : null,
    }
  })

  return NextResponse.json({ items })
}

// PUT /api/host/email-automatiche/config
// Upsert della configurazione per un template.
const putSchema = z.object({
  templateId: z.string().min(1),
  attiva: z.boolean().optional(),
  oggettoCustom: z.string().max(200).nullable().optional(),
  messaggioCustom: z.string().max(5000).nullable().optional(),
  ritardoOre: z.number().int().nullable().optional(),
})

export async function PUT(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json()
  const parsed = putSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const { templateId, attiva, oggettoCustom, messaggioCustom, ritardoOre } = parsed.data

  const meta = EMAIL_TEMPLATES.find((t) => t.id === templateId)
  if (!meta) return NextResponse.json({ error: 'Template sconosciuto' }, { status: 404 })

  // Template non-configurabili (es. prenotazione_richiesta_host): solo attiva e' toccabile,
  // custom text ignorato.
  const payloadCustom = meta.configurabileHost
    ? { oggettoCustom: oggettoCustom ?? null, messaggioCustom: messaggioCustom ?? null }
    : {}

  const result = await prisma.configEmail.upsert({
    where: { hostId_templateId: { hostId: auth.user.hostId, templateId } },
    create: {
      hostId: auth.user.hostId,
      templateId,
      attiva: attiva ?? true,
      ritardoOre: ritardoOre ?? null,
      ...payloadCustom,
    },
    update: {
      ...(attiva !== undefined ? { attiva } : {}),
      ...(ritardoOre !== undefined ? { ritardoOre } : {}),
      ...payloadCustom,
    },
  })

  await auditFromAuth(auth, {
    azione: 'email.config.aggiornata',
    entita: 'configEmail',
    entitaId: result.id,
    dettagli: `Config email ${templateId} aggiornata (attiva=${result.attiva})`,
  })

  return NextResponse.json({ ok: true, config: result })
}

// DELETE /api/host/email-automatiche/config?templateId=...
// Ripristina default rimuovendo la configurazione custom.
export async function DELETE(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const { searchParams } = new URL(req.url)
  const templateId = searchParams.get('templateId')
  if (!templateId) return NextResponse.json({ error: 'templateId richiesto' }, { status: 400 })

  await prisma.configEmail.deleteMany({
    where: { hostId: auth.user.hostId, templateId },
  })

  await auditFromAuth(auth, {
    azione: 'email.config.ripristinata',
    entita: 'configEmail',
    entitaId: null,
    dettagli: `Config email ${templateId} ripristinata a default`,
  })

  return NextResponse.json({ ok: true })
}
