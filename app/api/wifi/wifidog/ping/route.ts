import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/wifi/wifidog/ping/
 *
 * Heartbeat periodico dal router wifidog. Aggiorna lo stato del WifiDevice
 * nel DB. Standard wifidog protocol v1.
 *
 * Query params:
 *   gw_id            Identificatore del gateway
 *   sys_uptime       Uptime del router in secondi
 *   sys_memfree      Memoria libera in KB
 *   sys_load         Load average
 *   wifidog_uptime   Uptime del daemon wifidog in secondi
 *
 * Response: plaintext "Pong\n"
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const gw_id = sp.get('gw_id')

  const pong = () =>
    new NextResponse('Pong\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })

  if (!gw_id) return pong()

  const macNorm = String(gw_id).toUpperCase().replace(/[^0-9A-F]/g, '')

  // Aggiorna heartbeat del device (lookup per mac o alias)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null

  await prisma.wifiDevice
    .updateMany({
      where: macNorm.length === 12 ? { mac: macNorm } : { alias: gw_id },
      data: {
        stato: 'ONLINE',
        ultimoHeartbeatAt: new Date(),
        ultimoIpPubblico: ip,
      },
    })
    .catch(() => {
      // Non blocchiamo mai il Pong — il router deve sempre ricevere risposta
    })

  return pong()
}
