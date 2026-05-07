import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await params

  const device = await prisma.wifiDevice.findUnique({
    where: { id },
    select: {
      id: true, alias: true, mac: true, modello: true, firmware: true,
      stato: true, ultimoHeartbeatAt: true, ultimoIpPubblico: true,
      ultimoAgentVersion: true, note: true,
      host: { select: { id: true, nomeAzienda: true } },
      struttura: { select: { nome: true } },
    },
  })

  if (!device) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ device })
}
