import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import type { WifiSplashConfig } from '@/lib/wifi/types'

/**
 * GET  /api/host/wifi/devices/[mac]/splash
 *   Ritorna config splash corrente + valori ereditati dalla struttura come default.
 *
 * PUT  /api/host/wifi/devices/[mac]/splash
 *   Salva la config splash e accoda un comando `set_splash_branding` all'agent.
 *   Se la config contiene URL immagini nuove, accoda anche `upload_splash_image`.
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ mac: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { mac } = await params
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')

  const device = await prisma.wifiDevice.findFirst({
    where: { mac: macNorm, hostId: auth.user.hostId },
    include: {
      struttura: {
        select: {
          nome: true,
          logo: true,
          colorePrimario: true,
          coloreSecondario: true,
          fotoHero: true,
          linkSitoWeb: true,
        },
      },
    },
  })

  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const strutturaDefaults: WifiSplashConfig = device.struttura
    ? {
        titolo: device.struttura.nome || undefined,
        logoUrl: device.struttura.logo || undefined,
        colorePrimario: device.struttura.colorePrimario || undefined,
        coloreSecondario: device.struttura.coloreSecondario || undefined,
        slideshowUrls: device.struttura.fotoHero ? [device.struttura.fotoHero] : undefined,
        linkRedirect: device.struttura.linkSitoWeb || undefined,
      }
    : {}

  return NextResponse.json({
    current: (device.splashConfig as WifiSplashConfig | null) || {},
    strutturaDefaults,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ mac: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { mac } = await params
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')

  const device = await prisma.wifiDevice.findFirst({
    where: { mac: macNorm, hostId: auth.user.hostId },
    select: { id: true, splashConfig: true },
  })
  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await req.json()) as WifiSplashConfig

  // Expire scade dopo 24h — se l'agent non lo ritira, si marca come EXPIRED
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const [updated] = await prisma.$transaction([
    prisma.wifiDevice.update({
      where: { id: device.id },
      data: { splashConfig: body as object },
    }),
    prisma.wifiDeviceCommand.create({
      data: {
        deviceId: device.id,
        action: 'set_splash_branding',
        payload: {
          titolo: body.titolo,
          messaggio: body.messaggio,
          testoBottone: body.testoBottone,
          linkRedirect: body.linkRedirect,
        },
        createdByUserId: auth.user.id,
        expiresAt,
      },
    }),
  ])

  // Se ci sono immagini nuove, accoda anche upload_splash_image (una per slot)
  const imageCommands: Array<{ slot: string; url: string }> = []
  if (body.logoUrl) imageCommands.push({ slot: 'logo', url: body.logoUrl })
  if (body.slideshowUrls) {
    body.slideshowUrls.slice(0, 3).forEach((url, i) => {
      if (url) imageCommands.push({ slot: `slide${i + 1}`, url })
    })
  }

  if (imageCommands.length > 0) {
    await prisma.wifiDeviceCommand.createMany({
      data: imageCommands.map((c) => ({
        deviceId: device.id,
        action: 'upload_splash_image',
        payload: { slot: c.slot, sourceUrl: c.url } as object,
        createdByUserId: auth.user.id,
        expiresAt,
      })),
    })
  }

  return NextResponse.json({ ok: true, device: updated, queuedCommands: 1 + imageCommands.length })
}
