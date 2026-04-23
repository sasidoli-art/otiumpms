import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { createAIProvider, type AIMessage } from '@/lib/ai-provider'
import { getHostSecret } from '@/lib/host-secrets'
import { getConciergeConfig } from '@/lib/host-config'
import { getPlatformSettings } from '@/lib/platform-settings'
import { prisma } from '@/lib/db'

/**
 * POST /api/host/concierge/test
 *
 * Preview ephemeral del concierge: usa i settings SALVATI (non passati) — i campi
 * draft della UI devono essere salvati prima del test per essere attivi.
 *
 * Differenze vs `/simulate`: questo endpoint NON crea conversazioni né salva messaggi
 * in DB. Pensato per la chat-test embedded nella pagina impostazioni.
 *
 * Body: { testo: string, storia?: Array<{ruolo: 'user'|'assistant', testo: string}> }
 */
const schema = z.object({
  testo: z.string().min(1).max(2000),
  storia: z.array(z.object({
    ruolo: z.enum(['user', 'assistant']),
    testo: z.string(),
  })).optional().default([]),
})

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body non valido' }, { status: 422 })
  }
  const { testo, storia } = parsed.data

  const cfg = await getConciergeConfig(hostId)
  if (!cfg) return NextResponse.json({ error: 'Config concierge mancante' }, { status: 404 })

  // Struttura base (per system prompt)
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      nomeAzienda: true,
      strutture: {
        take: 1, orderBy: { createdAt: 'asc' },
        select: { nome: true, citta: true, regione: true, indirizzo: true, descrizione: true },
      },
    },
  })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  const struttura = host.strutture[0] ?? null

  const lingua = cfg.conciergeLinguaDefault ?? 'it'
  const strutturaBlock = struttura
    ? [
        `Nome: ${struttura.nome}`,
        struttura.indirizzo ? `Indirizzo: ${struttura.indirizzo}${struttura.citta ? `, ${struttura.citta}` : ''}` : '',
        struttura.regione ? `Regione: ${struttura.regione}` : '',
        struttura.descrizione ? `Descrizione: ${struttura.descrizione}` : '',
      ].filter(Boolean).join('\n')
    : `Nome: ${host.nomeAzienda}`

  const kb = cfg.conciergeKnowledgeBase?.trim() || null
  const hotelInfo = cfg.conciergeSystemPrompt ?? 'Nessuna informazione aggiuntiva configurata.'

  const systemPrompt = `Sei il concierge digitale di ${host.nomeAzienda}, assistente virtuale via WhatsApp (modalità TEST).

STRUTTURA:
${strutturaBlock}

INFORMAZIONI HOTEL:
${hotelInfo}
${kb ? `\nKNOWLEDGE BASE:\n${kb}` : ''}

REGOLE:
1. Rispondi nella lingua dell'ospite (default: ${lingua}).
2. Sei un'AI — dichiaralo se chiesto (AI Act EU Art. 50).
3. Tono cordiale, professionale.
4. Rispondi SOLO su struttura/soggiorno/zona. Non inventare.
5. Risposte concise — max 3-4 frasi. No markdown.`

  // Provider: BYO → fallback Platform Key
  const platform = await getPlatformSettings()
  const useBYO = !!cfg.conciergeApiKey
  const apiKey = useBYO
    ? await getHostSecret(hostId, 'conciergeApiKey')
    : platform.aiApiKey

  const provider = createAIProvider({
    provider: useBYO
      ? (cfg.conciergeProvider as 'ollama' | 'claude' | 'openai') || 'claude'
      : (platform.aiProvider as 'ollama' | 'claude' | 'openai') || 'claude',
    apiKey,
    model: useBYO ? cfg.conciergeModel : platform.aiModel,
    baseUrl: useBYO ? cfg.conciergeBaseUrl : platform.aiBaseUrl,
    temperature: cfg.conciergeTemperatura,
    maxTokens: cfg.conciergeMaxToken,
  })

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...storia.map((m) => ({ role: m.ruolo, content: m.testo })),
    { role: 'user', content: testo },
  ]

  try {
    const res = await provider.chat(messages)
    return NextResponse.json({
      ok: res.finishReason !== 'error',
      risposta: res.content ?? '(nessuna risposta)',
      tokensUsed: res.tokensUsed ?? 0,
      finishReason: res.finishReason,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      hint: 'Verifica API key e configurazione provider',
    }, { status: 500 })
  }
}
