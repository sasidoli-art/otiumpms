import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { processGuestMessage } from '@/lib/concierge'

/**
 * POST /api/host/concierge/simulate
 * Simula un messaggio WhatsApp per testare il Concierge AI.
 * Body: { telefono: string, nome: string, testo: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { telefono, nome, testo } = body

  if (!telefono || !testo) {
    return NextResponse.json({ error: 'telefono e testo obbligatori' }, { status: 400 })
  }

  try {
    const result = await processGuestMessage({
      hostId: auth.user.hostId,
      telefono,
      nomeWhatsApp: nome || 'Test',
      testo,
    })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({
      error: `Errore: ${err instanceof Error ? err.message : String(err)}`,
      hint: 'Verifica che il provider AI sia configurato (Ollama in locale o Claude/OpenAI con API key)',
    }, { status: 500 })
  }
}
