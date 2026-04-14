import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import { logger } from '@/lib/logger'

/**
 * GET /api/wifi/wifidog/login/
 *
 * Endpoint wifidog "login URL" — il router redirige qui gli ospiti non
 * autenticati. Accetta i query params standard wifidog e redirige alla
 * nostra pagina di login /wifi/login con i parametri preservati.
 *
 * Query params wifidog (standard protocol v1):
 *   gw_address  IP LAN del router (es. 172.16.0.1)
 *   gw_port     Porta del captive portal sul router (es. 2060)
 *   gw_id       Identificatore univoco del gateway (mappato a WifiDevice.mac)
 *   mac         MAC del client (aa:bb:cc:dd:ee:ff)
 *   url         URL originale richiesta dal client
 *
 * Risolve gw_id -> hostId via lookup su WifiDevice, poi redirige a
 * /wifi/login?h=<hostId>&wd_gw_address=...&wd_gw_port=...&wd_mac=...&wd_url=...
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const gw_id = sp.get('gw_id')
  const gw_address = sp.get('gw_address')
  const gw_port = sp.get('gw_port')
  const mac = sp.get('mac')
  const url = sp.get('url')

  if (!gw_id) {
    return new NextResponse('gw_id query param required', { status: 400 })
  }

  // Normalizza gw_id come MAC (se applicabile) per fare match col DB
  const macNorm = String(gw_id).toUpperCase().replace(/[^0-9A-F]/g, '')

  const device = await prisma.wifiDevice.findFirst({
    where: macNorm.length === 12 ? { mac: macNorm } : { alias: gw_id },
    select: {
      hostId: true,
      host: {
        select: { moduliAttivi: true, nomeAzienda: true },
      },
    },
  })

  if (!device) {
    logger.warn('Wifidog login: gateway non registrato', 'wifi/wifidog/login', {
      gw_id,
      mac: mac ?? undefined,
    })
    return new NextResponse(
      `Gateway "${gw_id}" non registrato. Contattare l'amministratore.`,
      { status: 404 }
    )
  }

  if (!isModuloAttivo(device.host.moduliAttivi, 'wifi')) {
    return new NextResponse('Wi-Fi module non attivo per questo host', { status: 403 })
  }

  // Costruisci redirect alla pagina di login con i parametri wifidog preservati
  const loginUrl = new URL('/wifi/login', req.nextUrl.origin)
  loginUrl.searchParams.set('h', device.hostId)
  if (gw_address) loginUrl.searchParams.set('wd_gw_address', gw_address)
  if (gw_port) loginUrl.searchParams.set('wd_gw_port', gw_port)
  loginUrl.searchParams.set('wd_gw_id', gw_id)
  if (mac) loginUrl.searchParams.set('wd_mac', mac)
  if (url) loginUrl.searchParams.set('wd_url', url)

  return NextResponse.redirect(loginUrl)
}
