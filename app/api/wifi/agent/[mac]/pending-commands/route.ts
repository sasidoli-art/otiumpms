import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiDevice } from '@/lib/wifi/auth'
import type { WifiAgentCommand } from '@/lib/wifi/types'

/**
 * GET /api/wifi/agent/[mac]/pending-commands
 * L'agent fa long-polling (in realtà short-polling 30s) per ricevere comandi.
 * Marca i comandi come SENT al momento del ritiro.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ mac: string }> }) {
  const { mac } = await params
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')

  const device = await requireWifiDevice(req, macNorm)
  if (device instanceof NextResponse) return device

  // Prima cosa: marca come EXPIRED i comandi scaduti senza ritiro
  const now = new Date()
  await prisma.wifiDeviceCommand.updateMany({
    where: { deviceId: device.id, stato: 'PENDING', expiresAt: { lt: now } },
    data: { stato: 'EXPIRED' },
  })

  // Poi ritira i PENDING ancora validi
  const pending = await prisma.wifiDeviceCommand.findMany({
    where: { deviceId: device.id, stato: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  if (pending.length > 0) {
    await prisma.wifiDeviceCommand.updateMany({
      where: { id: { in: pending.map((c) => c.id) } },
      data: { stato: 'SENT', sentAt: now },
    })
  }

  const commands: WifiAgentCommand[] = pending.map((c) => ({
    id: c.id,
    action: c.action as WifiAgentCommand['action'],
    params: (c.payload as Record<string, unknown>) || {},
    issuedAt: c.createdAt.toISOString(),
  }))

  return NextResponse.json({ commands })
}
