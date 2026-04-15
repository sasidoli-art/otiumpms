import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { createAIProvider } from '@/lib/ai-provider'
import { z } from 'zod'

/**
 * POST /api/host/concierge/test-connection
 *
 * Test live della configurazione AI provider: manda una domanda fittizia
 * in italiano e ritorna la risposta. Utile per verificare che la chiave
 * API e il base URL siano corretti prima di salvare.
 *
 * Body: { provider, apiKey, model, baseUrl }
 */
const bodySchema = z.object({
  provider: z.enum(['ollama', 'claude', 'openai']),
  apiKey: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  baseUrl: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => null)
  if (!raw) return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 422 })
  }

  const { provider, apiKey, model, baseUrl } = parsed.data

  // Non-ollama richiede API key
  if (provider !== 'ollama' && !apiKey) {
    return NextResponse.json(
      { ok: false, error: 'API key obbligatoria per questo provider' },
      { status: 200 }
    )
  }

  try {
    const aiProvider = createAIProvider({
      provider,
      apiKey: apiKey || null,
      model: model || null,
      baseUrl: baseUrl || null,
    })

    const res = await aiProvider.chat([
      {
        role: 'system',
        content:
          'Sei un concierge AI. Rispondi in italiano, molto brevemente (max 1 frase).',
      },
      {
        role: 'user',
        content: 'Dimmi solo "OK" se funzioni, niente altro.',
      },
    ])

    if (res.finishReason === 'error') {
      return NextResponse.json(
        { ok: false, error: 'Il provider ha ritornato errore. Verifica key/model/baseUrl.' },
        { status: 200 }
      )
    }

    return NextResponse.json({
      ok: true,
      response: res.content || '(nessun testo)',
      tokensUsed: res.tokensUsed,
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Errore sconosciuto',
      },
      { status: 200 }
    )
  }
}
