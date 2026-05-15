import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import type { SplashConfig } from '@/lib/wifi/splash-config'
import { renderSplashHtml } from '@/lib/wifi/splash-renderer'

/**
 * GET /api/host/wifi/splash-config
 * Restituisce la config attuale + HTML renderizzato per la preview.
 *
 * POST /api/host/wifi/splash-config
 * Body: { config: SplashConfig }
 * Salva la nuova config sul DB. Ritorna HTML renderizzato.
 */

async function getCurrentHostWithCheck() {
  const session = await getServerSession(authOptions)
  if (!session) return { error: 'unauthorized', status: 401 as const }
  const hostId = await getHostId()
  if (!hostId) return { error: 'no host', status: 401 as const }
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true, nomeAzienda: true, moduliAttivi: true, splashConfig: true },
  })
  if (!host) return { error: 'host not found', status: 404 as const }
  if (!isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return { error: 'modulo wifi disattivato', status: 403 as const }
  }
  return { host }
}

export async function GET() {
  const res = await getCurrentHostWithCheck()
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: res.status })

  const config = (res.host.splashConfig ?? {}) as SplashConfig
  const html = renderSplashHtml(res.host.nomeAzienda, config)

  return NextResponse.json({
    hostId: res.host.id,
    hostNomeAzienda: res.host.nomeAzienda,
    config,
    html,
  })
}

/** Limite size config (incluse immagini data URI). 1 MB ragionevole. */
const MAX_CONFIG_BYTES = 1_000_000

export async function POST(req: NextRequest) {
  const res = await getCurrentHostWithCheck()
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: res.status })

  const body = (await req.json().catch(() => ({}))) as { config?: SplashConfig }
  if (!body.config || typeof body.config !== 'object') {
    return NextResponse.json({ error: 'config required (object)' }, { status: 400 })
  }

  // Sanitizzazione minimale: rimuovi campi vuoti per non sporcare il DB
  const cleaned: SplashConfig = { ...body.config, v: 1 }
  for (const k of Object.keys(cleaned) as (keyof SplashConfig)[]) {
    const val = cleaned[k]
    if (val === '' || val === null) delete cleaned[k]
  }

  // Limite size globale (data URI inflate splashConfig)
  const serialized = JSON.stringify(cleaned)
  if (serialized.length > MAX_CONFIG_BYTES) {
    return NextResponse.json(
      { error: `Config troppo grande (${(serialized.length / 1024).toFixed(0)} KB > ${MAX_CONFIG_BYTES / 1024} KB). Riduci le immagini.` },
      { status: 413 },
    )
  }

  await prisma.host.update({
    where: { id: res.host.id },
    data: { splashConfig: cleaned as unknown as object },
  })

  const html = renderSplashHtml(res.host.nomeAzienda, cleaned)

  return NextResponse.json({ ok: true, config: cleaned, html })
}
