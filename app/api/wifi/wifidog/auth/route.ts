import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/wifi/wifidog/auth/
 *
 * Endpoint di validazione token chiamato dal router wifidog per autorizzare
 * o revocare l'accesso di un client.
 *
 * Query params wifidog (standard protocol v1):
 *   stage      "login" | "counters" | "logout"
 *   ip         IP del client
 *   mac        MAC del client
 *   token      Token generato al login (corrisponde a WifiSession.id)
 *   incoming   Bytes ricevuti (cumulativo, solo stage=counters)
 *   outgoing   Bytes inviati (cumulativo, solo stage=counters)
 *
 * Response: plaintext (formato standard wifidog)
 *   "Auth: 1\n"  -> client autorizzato
 *   "Auth: 0\n"  -> client non autorizzato / kick
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const stage = sp.get('stage') ?? 'login'
  const ip = sp.get('ip')
  const mac = sp.get('mac')
  const token = sp.get('token')

  const deny = () =>
    new NextResponse('Auth: 0\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })

  const allow = () =>
    new NextResponse('Auth: 1\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })

  if (!token || !mac) {
    logger.warn('Wifidog auth: token/mac missing', 'wifi/wifidog/auth', {
      stage,
      hasToken: !!token,
      hasMac: !!mac,
    })
    return deny()
  }

  const session = await prisma.wifiSession.findUnique({
    where: { id: token },
    select: {
      id: true,
      hostId: true,
      macClient: true,
      expiresAt: true,
      revokedAt: true,
    },
  })

  if (!session) {
    logger.warn('Wifidog auth: session token not found', 'wifi/wifidog/auth', {
      token: token.slice(0, 8),
      mac,
    })
    return deny()
  }

  // Sessione scaduta o revocata
  if (session.revokedAt || session.expiresAt < new Date()) {
    return deny()
  }

  const macUpper = mac.toUpperCase()

  // Se la sessione ha già un MAC associato, deve matchare
  if (session.macClient && session.macClient.toUpperCase() !== macUpper) {
    logger.warn('Wifidog auth: MAC mismatch', 'wifi/wifidog/auth', {
      token: token.slice(0, 8),
      expectedMac: session.macClient,
      actualMac: mac,
    })
    return deny()
  }

  // Prima call con stage=login: lega MAC e IP alla sessione
  if (!session.macClient) {
    await prisma.wifiSession.update({
      where: { id: token },
      data: {
        macClient: macUpper,
        ipClient: ip ?? undefined,
      },
    })
  }

  // stage=logout -> revoca la sessione
  if (stage === 'logout') {
    await prisma.wifiSession.update({
      where: { id: token },
      data: { revokedAt: new Date() },
    })
    return deny()
  }

  return allow()
}
