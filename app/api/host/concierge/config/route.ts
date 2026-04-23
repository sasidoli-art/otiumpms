import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { getConciergeConfig, setConciergeConfig } from '@/lib/host-config'

/**
 * GET /api/host/concierge/config
 *
 * Ritorna tutta la configurazione Concierge (AI + WhatsApp + comportamento).
 * Secret (conciergeApiKey, whatsappAccessToken) mascherati come '••••••••' se presenti.
 */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const cfg = await getConciergeConfig(auth.user.hostId)
  if (!cfg) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  return NextResponse.json({
    ...cfg,
    conciergeApiKey: cfg.conciergeApiKey ? '••••••••' : '',
    whatsappAccessToken: cfg.whatsappAccessToken ? '••••••••' : '',
    conciergeApiKeySet: !!cfg.conciergeApiKey,
    whatsappAccessTokenSet: !!cfg.whatsappAccessToken,
  })
}

/**
 * PATCH /api/host/concierge/config
 *
 * Aggiorna la configurazione Concierge. Pattern secret:
 *   - campo omesso → invariato
 *   - '••••••••' o '***' → invariato (UI non altera)
 *   - '' → rimosso (null)
 *   - altro → sovrascrive (cifrato at rest)
 */
const schema = z.object({
  // AI base
  conciergeAttivo: z.boolean().optional(),
  conciergeProvider: z.enum(['ollama', 'claude', 'openai']).optional(),
  conciergeApiKey: z.string().nullable().optional(),
  conciergeModel: z.string().nullable().optional(),
  conciergeBaseUrl: z.string().nullable().optional(),
  conciergeSystemPrompt: z.string().nullable().optional(),
  conciergeGdprAcceptedAt: z.string().datetime().nullable().optional(),
  // Tuning AI
  conciergeTemperatura: z.number().min(0).max(2).nullable().optional(),
  conciergeMaxToken: z.number().int().min(50).max(4000).nullable().optional(),
  conciergeKnowledgeBase: z.string().max(10000).nullable().optional(),
  // Comportamento
  conciergeLinguaDefault: z.string().regex(/^(it|en|fr|de|es)$/).nullable().optional(),
  conciergeAutoEscalation: z.number().int().min(0).max(100).nullable().optional(),
  conciergeOrariAttiviDa: z.string().regex(/^\d{1,2}:\d{2}$/).nullable().optional(),
  conciergeOrariAttiviA: z.string().regex(/^\d{1,2}:\d{2}$/).nullable().optional(),
  conciergeMessaggioFuoriOrario: z.string().max(500).nullable().optional(),
  // WhatsApp
  whatsappNumeroId: z.string().nullable().optional(),
  whatsappAccessToken: z.string().nullable().optional(),
  whatsappVerifyToken: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const data = { ...parsed.data } as Record<string, unknown>

  // Normalizza secret: '••••••••'/'***' = invariato → omettere dalla patch
  const isMask = (v: unknown) => typeof v === 'string' && (v === '••••••••' || v === '***')
  if (isMask(data.conciergeApiKey)) delete data.conciergeApiKey
  if (isMask(data.whatsappAccessToken)) delete data.whatsappAccessToken

  // Converti stringhe vuote in null per i secret → significa rimuovi
  if (data.conciergeApiKey === '') data.conciergeApiKey = null
  if (data.whatsappAccessToken === '') data.whatsappAccessToken = null

  // Converti datetime string → Date
  if (data.conciergeGdprAcceptedAt && typeof data.conciergeGdprAcceptedAt === 'string') {
    data.conciergeGdprAcceptedAt = new Date(data.conciergeGdprAcceptedAt)
  }

  await setConciergeConfig(auth.user.hostId, data)

  await auditFromAuth(auth, {
    azione: 'concierge.config_aggiornata',
    entita: 'HostConciergeConfig',
    dettagli: `Aggiornata configurazione Concierge (${Object.keys(data).length} campi)`,
  })

  return NextResponse.json({ ok: true })
}
