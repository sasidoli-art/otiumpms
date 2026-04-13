import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ mac: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { mac } = await params
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')

  const device = await prisma.wifiDevice.findFirst({
    where: { mac: macNorm, hostId: auth.user.hostId },
    include: {
      struttura: { select: { id: true, nome: true, logo: true, colorePrimario: true, coloreSecondario: true, fotoHero: true } },
      _count: { select: { guestUsers: true, commands: true } },
    },
  })

  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(device)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ mac: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { mac } = await params
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')

  const existing = await prisma.wifiDevice.findFirst({
    where: { mac: macNorm, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { alias, strutturaId, note, defaultUserDurationMin, defaultUserBandwidthKbps } = body

  const updated = await prisma.wifiDevice.update({
    where: { id: existing.id },
    data: {
      ...(alias !== undefined ? { alias } : {}),
      ...(strutturaId !== undefined ? { strutturaId: strutturaId || null } : {}),
      ...(note !== undefined ? { note: note || null } : {}),
      ...(defaultUserDurationMin !== undefined ? { defaultUserDurationMin } : {}),
      ...(defaultUserBandwidthKbps !== undefined ? { defaultUserBandwidthKbps } : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ mac: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { mac } = await params
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')

  const existing = await prisma.wifiDevice.findFirst({
    where: { mac: macNorm, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.wifiDevice.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
}
