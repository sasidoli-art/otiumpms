import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * GET /api/wifi/agent/bundle
 * Serve lo script shell dell'agente Otium per i router Comfast.
 * Usato dall'action update_agent per auto-aggiornamento.
 * Non richiede auth: lo script non contiene segreti (token è per-device).
 */
export async function GET() {
  try {
    const script = readFileSync(join(process.cwd(), 'lib/wifi/agent-template.sh'), 'utf8')
    return new NextResponse(script, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new NextResponse('# agent not found\n', { status: 404 })
  }
}
