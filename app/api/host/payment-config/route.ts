import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/payment-config — config provider pagamento
 * PATCH — aggiorna config
 */
export async function GET(_: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const config = await prisma.paymentProviderConfig.findUnique({
    where: { hostId: auth.user.hostId },
  })

  // Maschera le chiavi sensibili
  if (config) {
    return NextResponse.json({
      ...config,
      stripeSecretKey: config.stripeSecretKey ? `sk_...${config.stripeSecretKey.slice(-4)}` : null,
      adyenApiKey: config.adyenApiKey ? `***${config.adyenApiKey.slice(-4)}` : null,
      sumupApiKey: config.sumupApiKey ? `***${config.sumupApiKey.slice(-4)}` : null,
      nexiApiKey: config.nexiApiKey ? `***${config.nexiApiKey.slice(-4)}` : null,
    })
  }

  return NextResponse.json({ providerAttivo: 'MANUALE' })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const allowedFields = [
    'providerAttivo', 'stripeSecretKey', 'stripeLocationId', 'stripeReaderId',
    'adyenApiKey', 'adyenMerchantAccount', 'adyenTerminalId', 'adyenEnvironment',
    'nexiApiKey', 'nexiTerminalId', 'sumupApiKey', 'sumupDeviceId',
  ]

  const data: Record<string, unknown> = {}
  for (const k of allowedFields) {
    if (body[k] !== undefined) data[k] = body[k]
  }

  const config = await prisma.paymentProviderConfig.upsert({
    where: { hostId: auth.user.hostId },
    update: data,
    create: { hostId: auth.user.hostId, ...data },
  })

  return NextResponse.json({ ok: true, providerAttivo: config.providerAttivo })
}
