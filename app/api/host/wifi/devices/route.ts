import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import { generateWifiToken, hashWifiToken } from '@/lib/wifi/auth'

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { moduliAttivi: true },
  })
  if (!host || !isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return NextResponse.json({ error: 'Modulo Wi-Fi non attivo' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const strutturaId = sp.get('strutturaId') || undefined

  const devices = await prisma.wifiDevice.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(strutturaId ? { strutturaId } : {}),
    },
    include: {
      struttura: { select: { id: true, nome: true } },
      _count: { select: { guestUsers: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(devices)
}

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { moduliAttivi: true },
  })
  if (!host || !isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return NextResponse.json({ error: 'Modulo Wi-Fi non attivo' }, { status: 403 })
  }

  const body = await req.json()
  const { alias, mac, modello, strutturaId, note } = body

  if (!alias || !mac) {
    return NextResponse.json({ error: 'alias e mac obbligatori' }, { status: 400 })
  }

  const macNorm = String(mac).toUpperCase().replace(/[^0-9A-F]/g, '')
  if (macNorm.length !== 12) {
    return NextResponse.json({ error: 'MAC non valido' }, { status: 400 })
  }

  // Verifica struttura appartiene all'host (multi-tenant)
  if (strutturaId) {
    const s = await prisma.struttura.findFirst({
      where: { id: strutturaId, hostId: auth.user.hostId },
      select: { id: true },
    })
    if (!s) return NextResponse.json({ error: 'Struttura non valida' }, { status: 400 })
  }

  // Genera token che viene mostrato UNA SOLA VOLTA e poi salvato solo come hash
  const token = generateWifiToken()

  const device = await prisma.wifiDevice.create({
    data: {
      hostId: auth.user.hostId,
      strutturaId: strutturaId || null,
      alias,
      mac: macNorm,
      modello: modello || null,
      apiTokenHash: hashWifiToken(token),
      note: note || null,
    },
  })

  return NextResponse.json({ device, provisioningToken: token }, { status: 201 })
}
