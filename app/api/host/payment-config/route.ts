import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { applySecretUpdate, PAYMENT_SECRET_FIELDS, maskSecret, isMasked } from '@/lib/secrets'
import { audit } from '@/lib/audit'

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

  // Maschera le chiavi sensibili (i valori storage sono cifrati, non utilizzabili in tail-preview)
  if (config) {
    return NextResponse.json({
      ...config,
      stripeSecretKey: maskSecret(config.stripeSecretKey),
      adyenApiKey: maskSecret(config.adyenApiKey),
      sumupApiKey: maskSecret(config.sumupApiKey),
      nexiApiKey: maskSecret(config.nexiApiKey),
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

  const existing = await prisma.paymentProviderConfig.findUnique({ where: { hostId: auth.user.hostId } })

  const data: Record<string, unknown> = {}
  for (const k of allowedFields) {
    if (body[k] === undefined) continue
    if ((PAYMENT_SECRET_FIELDS as readonly string[]).includes(k)) {
      data[k] = applySecretUpdate(body[k], (existing as any)?.[k] ?? null)
    } else {
      data[k] = body[k]
    }
  }

  const config = await prisma.paymentProviderConfig.upsert({
    where: { hostId: auth.user.hostId },
    update: data,
    create: { hostId: auth.user.hostId, ...data },
  })

  // Audit log dei secret toccati (senza valori)
  const touchedSecrets = (PAYMENT_SECRET_FIELDS as readonly string[]).filter(
    (f) => body[f] !== undefined && body[f] !== null && !isMasked(body[f]),
  )
  if (touchedSecrets.length > 0) {
    await audit({
      hostId: auth.user.hostId,
      userId: auth.user.id,
      userEmail: auth.user.email,
      azione: 'payment-config.secret.updated',
      entita: 'paymentProviderConfig',
      entitaId: auth.user.hostId,
      dettagli: `Secrets updated: ${touchedSecrets.join(', ')}`,
    })
  }

  return NextResponse.json({ ok: true, providerAttivo: config.providerAttivo })
}
