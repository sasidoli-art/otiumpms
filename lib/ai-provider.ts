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
 */

import { logger } from '@/lib/logger'

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

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || ''
    this.model = config.model || 'claude-haiku-4-5-20251001'
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
      max_tokens: 1024,
      messages: anthropicMessages,
    }
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

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || ''
    this.model = config.model || 'gpt-4o-mini'
    // baseUrl custom permette di usare qualsiasi gateway OpenAI-compatibile
    // (OpenRouter, Groq, Together, Perplexity, Azure OpenAI, ecc.)
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
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
          // OpenRouter richiede HTTP-Referer + X-Title per tracking (facoltativi)
          'HTTP-Referer': 'https://otium-pms.vercel.app',
          'X-Title': 'Otium PMS',
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
