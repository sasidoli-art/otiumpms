import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiApiKey, isAuthError } from '@/lib/wifi/public-auth'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/public/wifi/sessions/[mac]
 * Scope: sessions:write
 *
 * "Kick" un device: revoca tutte le sessioni attive del MAC + emette comando
 * agent per rimuoverlo dal whitelist iptables sul router.
 *
 * mac path param: AA:BB:CC:DD:EE:FF o AABBCCDDEEFF
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ mac: string }> }) {
  const auth = await requireWifiApiKey(req, 'sessions:write')
  if (isAuthError(auth)) return auth

  const { mac } = await params
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')
  if (macNorm.length !== 12) {
    return NextResponse.json({ error: 'Invalid MAC (need 12 hex chars)' }, { status: 400 })
  }

  // Formato con colons per il match in DB (storage canonico)
  const macColons = macNorm.match(/.{2}/g)!.join(':').toUpperCase()

  // Revoca sessioni live
  const result = await prisma.wifiSession.updateMany({
    where: {
      hostId: auth.hostId,
      OR: [{ macClient: macColons }, { macClient: macNorm }],
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date() },
  })

  // Emetti comando "revoke_mac" agli WifiDevice dell'host per rimuovere
  // dal whitelist iptables al prossimo poll comandi
  const devices = await prisma.wifiDevice.findMany({
    where: { hostId: auth.hostId, stato: { in: ['ONLINE', 'PENDING'] } },
    select: { id: true },
  })

  for (const d of devices) {
    await prisma.wifiDeviceCommand.create({
      data: {
        deviceId: d.id,
        action: 'revoke_mac',
        payload: { mac: macColons },
      },
    }).catch(() => {})
  }

  return NextResponse.json({
    ok: true,
    revokedSessions: result.count,
    devicesNotified: devices.length,
  })
}
