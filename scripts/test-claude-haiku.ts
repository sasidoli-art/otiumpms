import { createAIProvider } from '../lib/ai-provider'

/**
 * Test Claude Haiku 4.5 (Anthropic) come provider concierge.
 *
 * Usage:
 *   npx tsx scripts/test-claude-haiku.ts sk-ant-api03-...
 *   ANTHROPIC_KEY=sk-ant-... npx tsx scripts/test-claude-haiku.ts
 */
async function main() {
  const apiKey = process.env.ANTHROPIC_KEY || process.argv[2]
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'

  if (!apiKey) {
    console.error('Usage: npx tsx scripts/test-claude-haiku.ts sk-ant-api03-...')
    process.exit(1)
  }

  const provider = createAIProvider({
    provider: 'claude',
    apiKey,
    model,
  })

  console.log(`Testing ${model}...`)
  console.log('')

  // Test 1: italiano realistico
  const start = Date.now()
  const res = await provider.chat([
    {
      role: 'system',
      content:
        'Sei il concierge AI dell\'Agriturismo Il Poggio, in Toscana. Rispondi in italiano, cortesemente, frasi brevi (max 3). Tono caldo e professionale.',
    },
    {
      role: 'user',
      content:
        'Ciao, sono Mario, sono in camera 12. A che ora posso fare check-in? E c\'è una palestra in struttura?',
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
    console.error('❌ ERROR: il provider ha ritornato errore.')
    process.exit(1)
  }

  // Test 2: tool_use (essenziale per il concierge)
  console.log('')
  console.log('=== TEST TOOL_USE (concierge ha 16 tool, deve sceglierli giusti) ===')
  const res2 = await provider.chat(
    [
      {
        role: 'system',
        content:
          'Sei il concierge dell\'Agriturismo Il Poggio. Hai accesso a tool per gestire le richieste degli ospiti. Usali quando appropriato.',
      },
      {
        role: 'user',
        content: 'Sono Mario in camera 12, mi serve un cuscino in più, grazie.',
      },
    ],
    [
      {
        name: 'request_housekeeping',
        description: 'Crea una richiesta al servizio di pulizie/housekeeping per portare un oggetto in camera (cuscino, asciugamano, spazzolino, ecc.) o per fare un servizio (pulizia, cambio biancheria).',
        parameters: {
          type: 'object',
          properties: {
            room: { type: 'string', description: 'Numero della camera dell\'ospite' },
            item: { type: 'string', description: 'Oggetto richiesto (es. cuscino)' },
            urgency: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Urgenza della richiesta',
            },
            notes: { type: 'string', description: 'Note aggiuntive opzionali' },
          },
          required: ['room', 'item'],
        },
      },
      {
        name: 'get_local_recommendations',
        description: 'Restituisce suggerimenti su ristoranti, attrazioni, attività della zona.',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['restaurant', 'attraction', 'activity'] },
            cuisine: { type: 'string', description: 'Tipo cucina (italiana, pesce, ecc.)' },
          },
          required: ['category'],
        },
      },
    ]
  )

  console.log('Tool calls richieste:', res2.toolCalls.length)
  if (res2.toolCalls.length > 0) {
    res2.toolCalls.forEach((tc) => {
      console.log(`  → ${tc.name}`, JSON.stringify(tc.arguments))
    })
    const correct = res2.toolCalls[0].name === 'request_housekeeping'
    console.log(correct ? '✅ Tool corretto scelto (request_housekeeping)' : '⚠️  Tool sbagliato scelto')
  } else {
    console.log('Content:', res2.content?.slice(0, 100))
    console.log('⚠️  Claude non ha usato tool — potrebbe essere prompt da rivedere')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
