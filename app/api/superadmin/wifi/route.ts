import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const stato = sp.get('stato') ?? ''
  const hostId = sp.get('host') ?? ''

  const devices = await prisma.wifiDevice.findMany({
    where: {
      ...(stato ? { stato: stato as 'PENDING' | 'ONLINE' | 'OFFLINE' | 'DISABLED' } : {}),
      ...(hostId ? { hostId } : {}),
    },
    select: {
      id: true,
      alias: true,
      mac: true,
      modello: true,
      firmware: true,
      stato: true,
      ultimoHeartbeatAt: true,
      ultimoIpPubblico: true,
      ultimoAgentVersion: true,
      note: true,
      createdAt: true,
      host: { select: { id: true, nomeAzienda: true } },
      struttura: { select: { id: true, nome: true } },
      _count: { select: { guestUsers: true, accessLogs: true } },
    },
    orderBy: [{ stato: 'asc' }, { alias: 'asc' }],
  })

  return NextResponse.json({ devices, totale: devices.length })
}
