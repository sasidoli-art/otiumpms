import { createAIProvider } from '../lib/ai-provider'

/**
 * Test Qwen via OpenRouter come provider OpenAI-compatible.
 *
 * Usage:
 *   OPENROUTER_KEY=sk-or-v1-xxx npx tsx scripts/test-qwen-openrouter.ts
 *
 * Oppure passandolo come primo argomento:
 *   npx tsx scripts/test-qwen-openrouter.ts sk-or-v1-xxx
 */
async function main() {
  const apiKey = process.env.OPENROUTER_KEY || process.argv[2]
  const model = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct'

  if (!apiKey) {
    console.error('Usage: OPENROUTER_KEY=sk-or-v1-... npx tsx scripts/test-qwen-openrouter.ts')
    console.error('Oppure:   npx tsx scripts/test-qwen-openrouter.ts sk-or-v1-...')
    process.exit(1)
  }

  const provider = createAIProvider({
    provider: 'openai',
    apiKey,
    model,
    baseUrl: 'https://openrouter.ai/api/v1',
  })

  console.log(`Testing ${model} via OpenRouter...`)
  console.log('')

  // Test 1: simple Q&A in italiano
  const start = Date.now()
  const res = await provider.chat([
    {
      role: 'system',
      content:
        'Sei il concierge AI di Otium, un PMS italiano per B&B e hotel. Rispondi in italiano, cortesemente, frasi brevi.',
    },
    {
      role: 'user',
      content:
        'Ciao, sono un ospite del B&B Il Poggio. A che ora posso fare check-in? C\'è una palestra in struttura?',
    },
  ])

  const elapsed = Date.now() - start

  console.log('=== RESPONSE ===')
  console.log(res.content ?? '(nessun testo)')
  console.log('')
  console.log('=== METRICS ===')
  console.log('Token usati:', res.tokensUsed)
  console.log('Finish reason:', res.finishReason)
  console.log('Tempo risposta:', elapsed, 'ms')

  if (res.finishReason === 'error') {
    console.error('')
    console.error('❌ ERROR: il provider ha ritornato errore. Vedi log sopra.')
    process.exit(1)
  }

  // Test 2: tool_use (come il concierge reale usa i tool per query DB)
  console.log('')
  console.log('=== TEST TOOL_USE ===')
  const res2 = await provider.chat(
    [
      {
        role: 'system',
        content: 'Sei un assistente. Usa i tool disponibili quando serve.',
      },
      { role: 'user', content: 'Che tempo fa a Roma oggi?' },
    ],
    [
      {
        name: 'get_weather',
        description: 'Ottiene il meteo attuale per una città',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string', description: 'Nome della città' },
          },
          required: ['city'],
        },
      },
    ]
  )

  console.log('Tool calls richieste:', res2.toolCalls.length)
  if (res2.toolCalls.length > 0) {
    console.log('  →', res2.toolCalls[0].name, JSON.stringify(res2.toolCalls[0].arguments))
    console.log('✅ Tool use OK — Qwen può usare i tool del concierge Otium')
  } else {
    console.log('Content:', res2.content?.slice(0, 100))
    console.log(
      '⚠️  Qwen non ha usato il tool — potrebbe significare che non supporta tool_use nel modo OpenAI-compatible'
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
