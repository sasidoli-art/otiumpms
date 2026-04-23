/**
 * AI Provider Abstraction Layer
 *
 * Interfaccia unica per chiamare LLM con tool_use.
 * Supporta: Ollama (gratis, locale), Claude, OpenAI.
 * L'host sceglie il provider e porta la propria API key.
 *
 * Uso:
 *   const provider = createAIProvider({ provider: 'ollama', model: 'llama3.1' })
 *   const response = await provider.chat(messages, tools)
 *
 * Esiste inoltre `generaRispostaConcierge(...)` — wrapper single-turn per la UI di
 * test/simulazione che NON salva in DB (a differenza di `processGuestMessage` in
 * `lib/concierge.ts`, che è l'orchestratore canonico del webhook WhatsApp).
 */

import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db'
import { getHostSecret } from '@/lib/host-secrets'
import { getPlatformSettings } from '@/lib/platform-settings'
import { revealSecret } from '@/lib/secrets'

// ─── Tipi comuni ──────────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string       // per messaggi tool result
  tool_calls?: AIToolCall[]   // per risposte assistant con tool calls
}

export interface AIToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AIToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>  // JSON Schema
}

export interface AIResponse {
  content: string | null           // testo della risposta (null se solo tool calls)
  toolCalls: AIToolCall[]          // tool calls richieste dall'AI
  tokensUsed: number | null        // token consumati (se disponibile)
  finishReason: 'stop' | 'tool_use' | 'error'
}

export interface AIProviderConfig {
  provider: 'ollama' | 'claude' | 'openai'
  apiKey?: string | null
  model?: string | null
  baseUrl?: string | null  // Ollama custom URL, oppure OpenAI-compatible gateway (es. OpenRouter)
  temperature?: number | null  // 0.0 - 1.0 (null = default provider)
  maxTokens?: number | null    // max token risposta (null = default provider)
}

export interface AIProvider {
  chat(messages: AIMessage[], tools?: AIToolDefinition[]): Promise<AIResponse>
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case 'ollama':
      return new OllamaProvider(config)
    case 'claude':
      return new ClaudeProvider(config)
    case 'openai':
      return new OpenAIProvider(config)
    default:
      throw new Error(`Provider AI non supportato: ${config.provider}`)
  }
}

// ─── Ollama (gratis, locale) ──────────────────────────────────────────────────

class OllamaProvider implements AIProvider {
  private baseUrl: string
  private model: string

  constructor(config: AIProviderConfig) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    this.model = config.model || 'llama3.1'
  }

  async chat(messages: AIMessage[], tools?: AIToolDefinition[]): Promise<AIResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role === 'tool' ? 'assistant' : m.role,
        content: m.content,
      })),
      stream: false,
    }

    // Ollama supporta tools dal formato OpenAI-compatible
    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }))
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        logger.error('Ollama API error', { status: res.status, body: text })
        return { content: null, toolCalls: [], tokensUsed: null, finishReason: 'error' }
      }

      const data = await res.json()
      const msg = data.message

      // Parse tool calls se presenti
      const toolCalls: AIToolCall[] = (msg?.tool_calls || []).map((tc: { function: { name: string; arguments: Record<string, unknown> } }, i: number) => ({
        id: `ollama_${Date.now()}_${i}`,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }))

      return {
        content: msg?.content || null,
        toolCalls,
        tokensUsed: data.eval_count || null,
        finishReason: toolCalls.length > 0 ? 'tool_use' : 'stop',
      }
    } catch (err) {
      logger.error('Ollama connection error', { error: String(err) })
      return { content: null, toolCalls: [], tokensUsed: null, finishReason: 'error' }
    }
  }
}

// ─── Claude (Anthropic) ───────────────────────────────────────────────────────

class ClaudeProvider implements AIProvider {
  private apiKey: string
  private model: string
  private temperature: number | undefined
  private maxTokens: number

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || ''
    this.model = config.model || 'claude-haiku-4-5-20251001'
    this.temperature = config.temperature ?? undefined
    this.maxTokens = config.maxTokens ?? 1024
    if (!this.apiKey) throw new Error('API key Anthropic obbligatoria per provider Claude')
  }

  async chat(messages: AIMessage[], tools?: AIToolDefinition[]): Promise<AIResponse> {
    // Separa il system message
    const systemMsg = messages.find(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')

    // Converti messaggi al formato Anthropic
    const anthropicMessages = chatMessages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'user' as const,
          content: [{
            type: 'tool_result' as const,
            tool_use_id: m.tool_call_id || '',
            content: m.content,
          }],
        }
      }
      if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
        const content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> = []
        if (m.content) content.push({ type: 'text', text: m.content })
        for (const tc of m.tool_calls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          })
        }
        return { role: 'assistant' as const, content }
      }
      return { role: m.role as 'user' | 'assistant', content: m.content }
    })

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: anthropicMessages,
    }
    if (this.temperature !== undefined) body.temperature = this.temperature
    if (systemMsg) body.system = systemMsg.content
    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }))
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        logger.error('Claude API error', { status: res.status, body: text })
        return { content: null, toolCalls: [], tokensUsed: null, finishReason: 'error' }
      }

      const data = await res.json()

      let content: string | null = null
      const toolCalls: AIToolCall[] = []

      for (const block of data.content || []) {
        if (block.type === 'text') content = block.text
        if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input,
          })
        }
      }

      const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

      return {
        content,
        toolCalls,
        tokensUsed,
        finishReason: data.stop_reason === 'tool_use' ? 'tool_use' : 'stop',
      }
    } catch (err) {
      logger.error('Claude connection error', { error: String(err) })
      return { content: null, toolCalls: [], tokensUsed: null, finishReason: 'error' }
    }
  }
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

class OpenAIProvider implements AIProvider {
  private apiKey: string
  private model: string
  private baseUrl: string
  private temperature: number | undefined
  private maxTokens: number | undefined

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || ''
    this.model = config.model || 'gpt-4o-mini'
    // baseUrl custom permette di usare qualsiasi gateway OpenAI-compatibile
    // (OpenRouter, Groq, Together, Perplexity, Azure OpenAI, ecc.)
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
    this.temperature = config.temperature ?? undefined
    this.maxTokens = config.maxTokens ?? undefined
    if (!this.apiKey) throw new Error('API key OpenAI obbligatoria per provider OpenAI')
  }

  async chat(messages: AIMessage[], tools?: AIToolDefinition[]): Promise<AIResponse> {
    const openaiMessages = messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_call_id: m.tool_call_id || '',
          content: m.content,
        }
      }
      if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
        return {
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        }
      }
      return { role: m.role as 'system' | 'user' | 'assistant', content: m.content }
    })

    const body: Record<string, unknown> = {
      model: this.model,
      messages: openaiMessages,
    }
    if (this.temperature !== undefined) body.temperature = this.temperature
    if (this.maxTokens !== undefined) body.max_tokens = this.maxTokens
    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }))
    }

    // ── GDPR routing: se siamo su OpenRouter, vincoliamo a provider EU-friendly
    // e disabilitiamo data collection upstream. Together AI ha data center EU,
    // Fireworks è DPF certified. allow_fallbacks=false rifiuta routing imprevisto.
    const isOpenRouter = this.baseUrl.includes('openrouter.ai')
    if (isOpenRouter) {
      body.provider = {
        order: ['Together', 'Fireworks', 'DeepInfra'],
        allow_fallbacks: false,
        data_collection: 'deny',
      }
    }

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          // OpenRouter richiede HTTP-Referer + X-Title per tracking (facoltativi).
          // Uso dominio marketing pubblico (non il PMS) per non esporre il pms a OpenRouter logs.
          'HTTP-Referer': 'https://www.otiumweek.com',
          'X-Title': 'Otium Week',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        logger.error('OpenAI API error', { status: res.status, body: text })
        return { content: null, toolCalls: [], tokensUsed: null, finishReason: 'error' }
      }

      const data = await res.json()
      const choice = data.choices?.[0]
      const msg = choice?.message

      const toolCalls: AIToolCall[] = (msg?.tool_calls || []).map((tc: { id: string; function: { name: string; arguments: string } }) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }))

      return {
        content: msg?.content || null,
        toolCalls,
        tokensUsed: data.usage ? data.usage.prompt_tokens + data.usage.completion_tokens : null,
        finishReason: choice?.finish_reason === 'tool_calls' ? 'tool_use' : 'stop',
      }
    } catch (err) {
      logger.error('OpenAI connection error', { error: String(err) })
      return { content: null, toolCalls: [], tokensUsed: null, finishReason: 'error' }
    }
  }
}

// ─── Single-turn Concierge wrapper ───────────────────────────────────────────
//
// `generaRispostaConcierge` è un helper per scenari in cui la gestione della
// conversazione avviene altrove (UI di test /host/concierge/test, anteprime AI,
// script batch). NON salva messaggi in DB — il chiamante decide se/come persistere.
//
// Per il flusso WhatsApp completo (identifica ospite, crea conversazione, tool-use
// loop, disclosure AI Act, audit), usa `processGuestMessage` in `lib/concierge.ts`.

export interface ContestoOspiteConcierge {
  nome: string
  camera?: string
  dataArrivo?: Date
  dataPartenza?: Date
  pianoPasto?: string
  lingua?: string
}

export interface RispostaConcierge {
  risposta: string
  tokenUsati: number
  fonteRisposta: 'ai' | 'knowledge_base' | 'escalation'
  escalare: boolean
  motivoEscalation?: string
}

/**
 * Costruisce il system prompt per il concierge, adattato ai campi reali
 * del modello `Struttura` (nome, citta, regione, indirizzo, descrizione).
 *
 * NB: il modello non ha oraCheckIn/oraCheckOut/telefono — quindi quelle info
 * devono stare dentro `conciergeSystemPrompt` (free-text dell'host).
 */
function buildSystemPrompt(
  host: {
    nomeAzienda: string
    conciergeSystemPrompt: string | null
    conciergeKnowledgeBase?: string | null
  },
  struttura: {
    nome: string; citta: string | null; regione: string | null
    indirizzo: string | null; descrizione: string | null
  } | null,
  ospite?: ContestoOspiteConcierge,
): string {
  const lingua = ospite?.lingua ?? 'it'
  const hotelInfo = host.conciergeSystemPrompt
    ?? 'Nessuna informazione specifica configurata dall\'hotel.'
  const kb = host.conciergeKnowledgeBase?.trim() || null

  const strutturaBlock = struttura
    ? [
        `Nome: ${struttura.nome}`,
        struttura.indirizzo ? `Indirizzo: ${struttura.indirizzo}${struttura.citta ? `, ${struttura.citta}` : ''}` : '',
        struttura.regione ? `Regione: ${struttura.regione}` : '',
        struttura.descrizione ? `Descrizione: ${struttura.descrizione}` : '',
      ].filter(Boolean).join('\n')
    : `Nome: ${host.nomeAzienda}`

  // Data minimization GDPR — solo primo nome, niente cognome/email/telefono
  const firstName = (ospite?.nome ?? '').split(' ')[0] || null
  const ospiteBlock = ospite
    ? [
        firstName ? `Nome: ${firstName}` : '',
        ospite.camera ? `Camera: ${ospite.camera}` : '',
        ospite.dataArrivo ? `Check-in: ${ospite.dataArrivo.toISOString().split('T')[0]}` : '',
        ospite.dataPartenza ? `Check-out: ${ospite.dataPartenza.toISOString().split('T')[0]}` : '',
        ospite.pianoPasto ? `Piano pasto: ${ospite.pianoPasto}` : '',
      ].filter(Boolean).join('\n')
    : null

  return `Sei il concierge digitale di ${host.nomeAzienda}, assistente virtuale per gli ospiti via WhatsApp.

STRUTTURA:
${strutturaBlock}

INFORMAZIONI HOTEL:
${hotelInfo}
${kb ? `\nKNOWLEDGE BASE (FAQ, info zona, servizi):\n${kb}\n` : ''}${ospiteBlock ? `\nOSPITE ATTUALE:\n${ospiteBlock}` : ''}

REGOLE:
1. Rispondi nella lingua dell'ospite (attualmente: ${lingua}).
2. Sei un'intelligenza artificiale — se l'ospite chiede esplicitamente se sei una persona, dichiaralo con onestà (obbligo AI Act EU Art. 50).
3. Tono cordiale ma professionale, da concierge di hotel.
4. Rispondi SOLO su struttura, soggiorno, zona, servizi offerti. Non inventare dati che non hai.
5. Per azioni che richiedono intervento umano (reclami, cambi camera, richieste particolari) dì che inoltri alla reception.
6. Se l'ospite chiede esplicitamente di parlare con una persona, dì che stai collegando un operatore.
7. Emergenza medica/sicurezza: rispondi di chiamare il 112 e la reception.
8. Risposte concise (max 3-4 frasi) — è WhatsApp, non email. No markdown, no asterischi.
9. Non condividere dati di altri ospiti o informazioni interne dell'hotel.`
}

// Heuristica escalation — match case-insensitive su italiano + inglese
const TRIGGER_OSPITE = [
  'parlare con qualcuno', 'parlare con una persona', 'operatore', 'reception',
  'persona reale', 'talk to someone', 'speak to human', 'real person',
  'reclamo', 'complaint', 'emergenza', 'emergency',
]
const TRIGGER_AI = [
  'inoltrerò', 'inoltro alla reception', 'contatterò la reception',
  'collego un operatore', 'forwarding', 'connecting you',
  'non posso aiutarti', 'non sono in grado',
]

function detectEscalation(
  rispostaAI: string,
  messaggioOspite: string,
): { escalare: boolean; motivo?: string } {
  const testoLower = messaggioOspite.toLowerCase()
  const rispostaLower = rispostaAI.toLowerCase()

  const daOspite = TRIGGER_OSPITE.find((t) => testoLower.includes(t))
  if (daOspite) return { escalare: true, motivo: `Richiesta esplicita ospite: "${daOspite}"` }

  const daAI = TRIGGER_AI.find((t) => rispostaLower.includes(t))
  if (daAI) return { escalare: true, motivo: `AI ha inoltrato alla reception: "${daAI}"` }

  return { escalare: false }
}

/**
 * Genera una risposta concierge per un turno singolo.
 *
 * - Carica `host` + `HostConciergeConfig` (per platform-key fallback)
 * - Sceglie struttura: quella della prenotazione linkata alla conversazione,
 *   altrimenti la prima struttura dell'host
 * - Ricostruisce la storia della conversazione (ultimi 20 messaggi) dal DB
 * - Chiama il provider AI configurato (BYO host oppure fallback Platform Key)
 * - Rileva escalation da keyword match (ospite o AI)
 *
 * Ritorna risposta + token consumati + flag escalation.
 * NON salva messaggi né aggiorna stato conversazione — compito del chiamante.
 */
export async function generaRispostaConcierge(params: {
  hostId: string
  conversazioneId: string
  messaggioOspite: string
  contestoOspite?: ContestoOspiteConcierge
}): Promise<RispostaConcierge> {
  const { hostId, conversazioneId, messaggioOspite, contestoOspite } = params

  // ─── Host + HostConciergeConfig ─────────────────────────────────────────
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      id: true,
      nomeAzienda: true,
      conciergeAttivo: true,
      conciergeProvider: true,
      conciergeModel: true,
      conciergeBaseUrl: true,
      conciergeApiKey: true,
      conciergeSystemPrompt: true,
      strutture: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, nome: true, citta: true, regione: true,
          indirizzo: true, descrizione: true,
        },
      },
    },
  })
  if (!host) throw new Error(`Host ${hostId} non trovato`)

  // Campi tuning + knowledge base sono SOLO su HostConciergeConfig (non su Host legacy)
  const cfg = await prisma.hostConciergeConfig.findUnique({
    where: { hostId },
    select: {
      conciergeTemperatura: true,
      conciergeMaxToken: true,
      conciergeKnowledgeBase: true,
      conciergeLinguaDefault: true,
    },
  })

  // Conversazione → prenotazione → struttura (se disponibile)
  const conversazione = await prisma.conversazioneWhatsApp.findUnique({
    where: { id: conversazioneId },
    select: {
      lingua: true,
      prenotazione: {
        select: {
          struttura: {
            select: {
              id: true, nome: true, citta: true, regione: true,
              indirizzo: true, descrizione: true,
            },
          },
        },
      },
    },
  })

  const struttura =
    conversazione?.prenotazione?.struttura ?? host.strutture[0] ?? null

  // Lingua: override da contesto → da conversazione → default host → 'it'
  const lingua =
    contestoOspite?.lingua
    ?? conversazione?.lingua
    ?? cfg?.conciergeLinguaDefault
    ?? 'it'

  // ─── Storia conversazione (ultimi 20) ──────────────────────────────────
  const storiaDesc = await prisma.messaggioWhatsApp.findMany({
    where: { conversazioneId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { mittente: true, testo: true },
  })
  const storia = storiaDesc.reverse()

  // ─── Costruzione messaggi ──────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(
    { ...host, conciergeKnowledgeBase: cfg?.conciergeKnowledgeBase ?? null },
    struttura,
    contestoOspite ? { ...contestoOspite, lingua } : undefined,
  )

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...storia.map((m) => ({
      role: (m.mittente === 'OSPITE' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.testo,
    })),
    { role: 'user', content: messaggioOspite },
  ]

  // ─── Provider config: BYO host → fallback Platform Key ──────────────────
  const platformSettings = await getPlatformSettings()
  const useBYO = !!host.conciergeApiKey
  const providerConfig: AIProviderConfig = useBYO
    ? {
        provider: (host.conciergeProvider as AIProviderConfig['provider']) || 'claude',
        apiKey: await getHostSecret(hostId, 'conciergeApiKey') ?? revealSecret(host.conciergeApiKey),
        model: host.conciergeModel,
        baseUrl: host.conciergeBaseUrl,
        temperature: cfg?.conciergeTemperatura ?? null,
        maxTokens: cfg?.conciergeMaxToken ?? null,
      }
    : {
        provider: (platformSettings.aiProvider as AIProviderConfig['provider']) || 'claude',
        apiKey: platformSettings.aiApiKey,
        model: platformSettings.aiModel,
        baseUrl: platformSettings.aiBaseUrl,
        temperature: cfg?.conciergeTemperatura ?? null,
        maxTokens: cfg?.conciergeMaxToken ?? null,
      }

  const provider = createAIProvider(providerConfig)

  // ─── Chiamata AI (single-turn, no tools) ───────────────────────────────
  const response = await provider.chat(messages)
  const risposta =
    response.content
    ?? 'Scusa, al momento non riesco a rispondere. La collego con la reception.'

  // ─── Escalation detection ──────────────────────────────────────────────
  // La risposta dell'AI potrebbe già contenere keyword di escalation
  // (es. "inoltrerò alla reception"). Coalizziamo entrambe le euristiche.
  const escalationResult = detectEscalation(risposta, messaggioOspite)

  // Risposta provider in errore → forziamo escalation
  const finishError = response.finishReason === 'error'
  const escalare = escalationResult.escalare || finishError
  const motivoEscalation = finishError
    ? 'Errore provider AI — fallback umano'
    : escalationResult.motivo

  return {
    risposta,
    tokenUsati: response.tokensUsed ?? 0,
    fonteRisposta: escalare ? 'escalation' : 'ai',
    escalare,
    motivoEscalation,
  }
}
