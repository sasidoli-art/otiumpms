import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { getPlatformSettings, updatePlatformSettings } from '@/lib/platform-settings'
import { audit } from '@/lib/audit'
import { z } from 'zod'

/**
 * GET /api/superadmin/platform-settings
 * Ritorna le impostazioni globali della piattaforma.
 * Nasconde la API key per default (restituisce "***" se presente, altrimenti null).
 */
export async function GET() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const settings = await getPlatformSettings()

  return NextResponse.json({
    id: settings.id,
    aiProvider: settings.aiProvider,
    aiModel: settings.aiModel,
    aiApiKey: settings.aiApiKey ? '***' : null, // masked
    aiApiKeySet: !!settings.aiApiKey,
    aiBaseUrl: settings.aiBaseUrl,
    updatedAt: settings.updatedAt,
  })
}

/**
 * PATCH /api/superadmin/platform-settings
 * Aggiorna le impostazioni globali (solo SuperAdmin).
 *
 * Body:
 *   aiProvider?  'claude' | 'openai' | 'ollama'
 *   aiModel?     string
 *   aiApiKey?    string (null o '' = rimuove; stringa con valore = sovrascrive; '***' = lascia invariato)
 *   aiBaseUrl?   string | null
 */
const bodySchema = z.object({
  aiProvider: z.enum(['claude', 'openai', 'ollama']).optional().nullable(),
  aiModel: z.string().max(128).optional().nullable(),
  aiApiKey: z.string().max(512).optional().nullable(),
  aiBaseUrl: z.string().max(255).optional().nullable().or(z.literal('')),
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

  // Mask sentinel: '***' = non toccare la chiave (l'utente non l'ha cambiata)
  const apiKeyToSave =
    d.aiApiKey === '***' ? current.aiApiKey : d.aiApiKey === '' ? null : d.aiApiKey ?? current.aiApiKey

  const updated = await updatePlatformSettings({
    aiProvider: d.aiProvider ?? current.aiProvider,
    aiModel: d.aiModel ?? current.aiModel,
    aiApiKey: apiKeyToSave,
    aiBaseUrl: d.aiBaseUrl === '' ? null : d.aiBaseUrl ?? current.aiBaseUrl,
  })

  await audit({
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.platform_settings.updated',
    entita: 'PlatformSettings',
    entitaId: 'singleton',
    dettagli: `Provider AI: ${updated.aiProvider}, Model: ${updated.aiModel}, BaseUrl: ${updated.aiBaseUrl ?? 'default'}, Key: ${updated.aiApiKey ? 'set' : 'cleared'}`,
  })

  return NextResponse.json({
    id: updated.id,
    aiProvider: updated.aiProvider,
    aiModel: updated.aiModel,
    aiApiKey: updated.aiApiKey ? '***' : null,
    aiApiKeySet: !!updated.aiApiKey,
    aiBaseUrl: updated.aiBaseUrl,
    updatedAt: updated.updatedAt,
  })
}
