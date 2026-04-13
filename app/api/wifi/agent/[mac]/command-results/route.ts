import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiDevice } from '@/lib/wifi/auth'
import type { WifiAgentCommandResult } from '@/lib/wifi/types'

/**
 * POST /api/wifi/agent/[mac]/command-results
 * L'agent riporta l'esito (success/error) di comandi precedentemente ritirati.
 * Body: { results: WifiAgentCommandResult[] }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ mac: string }> }) {
  const { mac } = await params
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')

  const device = await requireWifiDevice(req, macNorm)
  if (device instanceof NextResponse) return device

  const body = (await req.json()) as { results?: WifiAgentCommandResult[] }
  const results = Array.isArray(body.results) ? body.results : []

  let updated = 0
  for (const r of results) {
    // Conferma che il comando appartenga al device (anti-tamper)
    const cmd = await prisma.wifiDeviceCommand.findFirst({
      where: { id: r.id, deviceId: device.id },
      select: { id: true, stato: true },
    })
    if (!cmd) continue
    if (cmd.stato === 'DONE' || cmd.stato === 'FAILED') continue // idempotente

    await prisma.wifiDeviceCommand.update({
      where: { id: cmd.id },
      data: {
        stato: r.success ? 'DONE' : 'FAILED',
        doneAt: new Date(r.executedAt || Date.now()),
        result: (r.output as object) ?? undefined,
        errorMsg: r.success ? null : r.error || 'unknown error',
      },
    })
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
