import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiApiKey, isAuthError } from '@/lib/wifi/public-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/wifi/devices
 * Scope: devices:read
 *
 * Returns: { devices: [{ id, alias, mac, modello, stato, lastHeartbeat, ip, firmware }] }
 */
export async function GET(req: NextRequest) {
  const auth = await requireWifiApiKey(req, 'devices:read')
  if (isAuthError(auth)) return auth

  const devices = await prisma.wifiDevice.findMany({
    where: { hostId: auth.hostId },
    select: {
      id: true,
      alias: true,
      mac: true,
      modello: true,
      firmware: true,
      stato: true,
      ultimoHeartbeatAt: true,
      ultimoIpPubblico: true,
      ultimoAgentVersion: true,
      createdAt: true,
    },
    orderBy: [{ stato: 'asc' }, { alias: 'asc' }],
  })

  const now = Date.now()
  const enriched = devices.map(d => {
    const lastHbMs = d.ultimoHeartbeatAt?.getTime() ?? 0
    const minutesSinceHb = lastHbMs > 0 ? Math.floor((now - lastHbMs) / 60_000) : null
    // Stato calcolato: ONLINE se heartbeat <5 min, altrimenti stato DB
    const live = minutesSinceHb !== null && minutesSinceHb < 5 ? 'ONLINE' : (minutesSinceHb !== null && minutesSinceHb < 60 ? 'IDLE' : d.stato)
    return {
      id: d.id,
      alias: d.alias,
      mac: d.mac,
      modello: d.modello,
      firmware: d.firmware,
      stato: d.stato,
      statoLive: live,
      ultimoHeartbeatAt: d.ultimoHeartbeatAt?.toISOString() ?? null,
      minutesSinceHeartbeat: minutesSinceHb,
      ultimoIpPubblico: d.ultimoIpPubblico,
      ultimoAgentVersion: d.ultimoAgentVersion,
      createdAt: d.createdAt.toISOString(),
    }
  })

  return NextResponse.json({ devices: enriched })
}
