import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { getPlatformSettings, updatePlatformSettings } from '@/lib/platform-settings'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const MASK = '***'

/**
 * GET /api/superadmin/platform-settings
 * Ritorna le impostazioni globali. Maschera i secret (aiApiKey, smtpPass)
 * con '***' per evitarne l'esposizione lato client.
 */
export async function GET() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const s = await getPlatformSettings()

  return NextResponse.json({
    id: s.id,
    nomePiattaforma: s.nomePiattaforma,
    urlBase: s.urlBase,
    emailSupporto: s.emailSupporto,
    emailNoreply: s.emailNoreply,
    smtpHost: s.smtpHost,
    smtpPort: s.smtpPort,
    smtpUser: s.smtpUser,
    smtpPass: s.smtpPass ? MASK : null,
    smtpPassSet: !!s.smtpPass,
    smtpFrom: s.smtpFrom,
    aiProvider: s.aiProvider,
    aiModel: s.aiModel,
    aiApiKey: s.aiApiKey ? MASK : null,
    aiApiKeySet: !!s.aiApiKey,
    aiBaseUrl: s.aiBaseUrl,
    pianiOverride: s.pianiOverride,
    maintenanceMode: s.maintenanceMode,
    maintenanceMessage: s.maintenanceMessage,
    updatedAt: s.updatedAt,
  })
}

/**
 * PATCH /api/superadmin/platform-settings
 * Aggiorna campi. Per i secret: '***' = lascia invariato; '' = rimuove.
 */
const bodySchema = z.object({
  // Generale
  nomePiattaforma: z.string().max(100).nullable().optional(),
  urlBase: z.string().max(255).nullable().optional(),
  emailSupporto: z.string().email().nullable().optional().or(z.literal('')),
  emailNoreply: z.string().email().nullable().optional().or(z.literal('')),
  // SMTP
  smtpHost: z.string().max(255).nullable().optional(),
  smtpPort: z.number().int().nullable().optional(),
  smtpUser: z.string().max(255).nullable().optional(),
  smtpPass: z.string().max(512).nullable().optional(),
  smtpFrom: z.string().max(255).nullable().optional(),
  // AI
  aiProvider: z.enum(['claude', 'openai', 'ollama']).nullable().optional(),
  aiModel: z.string().max(128).nullable().optional(),
  aiApiKey: z.string().max(512).nullable().optional(),
  aiBaseUrl: z.string().max(255).nullable().optional().or(z.literal('')),
  // Piani override (JSON)
  pianiOverride: z.record(z.string(), z.object({
    prezzoMensile: z.number().optional(),
    prezzoAnnuale: z.number().optional(),
    moduliInclusi: z.array(z.string()).optional(),
  })).nullable().optional(),
  // Maintenance
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => null)
  if (!raw) return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const current = await getPlatformSettings()
  const d = parsed.data

  // Helper: '***' keeps, '' removes, value sets
  const resolveSecret = (incoming: string | null | undefined, existing: string | null): string | null => {
    if (incoming === undefined) return existing
    if (incoming === MASK) return existing
    if (incoming === '' || incoming === null) return null
    return incoming
  }

  const updateData: Record<string, unknown> = {}
  // Generale
  if (d.nomePiattaforma !== undefined) updateData.nomePiattaforma = d.nomePiattaforma
  if (d.urlBase !== undefined) updateData.urlBase = d.urlBase
  if (d.emailSupporto !== undefined) updateData.emailSupporto = d.emailSupporto === '' ? null : d.emailSupporto
  if (d.emailNoreply !== undefined) updateData.emailNoreply = d.emailNoreply === '' ? null : d.emailNoreply
  // SMTP
  if (d.smtpHost !== undefined) updateData.smtpHost = d.smtpHost
  if (d.smtpPort !== undefined) updateData.smtpPort = d.smtpPort
  if (d.smtpUser !== undefined) updateData.smtpUser = d.smtpUser
  if (d.smtpPass !== undefined) updateData.smtpPass = resolveSecret(d.smtpPass, current.smtpPass)
  if (d.smtpFrom !== undefined) updateData.smtpFrom = d.smtpFrom
  // AI
  if (d.aiProvider !== undefined) updateData.aiProvider = d.aiProvider
  if (d.aiModel !== undefined) updateData.aiModel = d.aiModel
  if (d.aiApiKey !== undefined) updateData.aiApiKey = resolveSecret(d.aiApiKey, current.aiApiKey)
  if (d.aiBaseUrl !== undefined) updateData.aiBaseUrl = d.aiBaseUrl === '' ? null : d.aiBaseUrl
  // Piani
  if (d.pianiOverride !== undefined) updateData.pianiOverride = d.pianiOverride
  // Maintenance
  if (d.maintenanceMode !== undefined) updateData.maintenanceMode = d.maintenanceMode
  if (d.maintenanceMessage !== undefined) updateData.maintenanceMessage = d.maintenanceMessage

  const updated = await updatePlatformSettings(updateData)

  const changedFields = Object.keys(updateData)
  await audit({
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.platform_settings.updated',
    entita: 'PlatformSettings',
    entitaId: 'singleton',
    dettagli: `Campi aggiornati: ${changedFields.join(', ')}`,
  })

  return NextResponse.json({
    ok: true,
    updatedFields: changedFields,
    updatedAt: updated.updatedAt,
  })
}
