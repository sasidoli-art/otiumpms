import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiDevice } from '@/lib/wifi/auth'
import type { WifiAgentHeartbeat } from '@/lib/wifi/types'

/**
 * POST /api/wifi/agent/[mac]/heartbeat
 * L'agent manda un heartbeat periodico (default: ogni polling = 30s).
 * Auth: Bearer token agent (vedi lib/wifi/auth.ts).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ mac: string }> }) {
  const { mac } = await params
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')

  const device = await requireWifiDevice(req, macNorm)
  if (device instanceof NextResponse) return device

  const body = (await req.json().catch(() => ({}))) as WifiAgentHeartbeat

  // IP pubblico del device = IP della connessione (x-forwarded-for dietro Vercel)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null

  await prisma.wifiDevice.update({
    where: { id: device.id },
    data: {
      stato: 'ONLINE',
      ultimoHeartbeatAt: new Date(),
      ultimoIpPubblico: ip,
      ultimoAgentVersion: body.agentVersion || device.ultimoAgentVersion,
      firmware: body.firmware || device.firmware,
    },
  })

  return NextResponse.json({ ok: true })
}
