import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import type { WifiAgentAction } from '@/lib/wifi/types'

const VALID_ACTIONS: WifiAgentAction[] = [
  'ping', 'get_status', 'get_ap_list', 'list_guest_users',
  'add_guest_user', 'revoke_guest_user',
]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await params

  const commands = await prisma.wifiDeviceCommand.findMany({
    where: { deviceId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, action: true, payload: true, stato: true,
      createdAt: true, sentAt: true, doneAt: true, result: true, errorMsg: true,
    },
  })

  return NextResponse.json({ commands })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const action = body.action as WifiAgentAction
  const payload = body.payload ?? {}

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'action non valida' }, { status: 400 })
  }

  const device = await prisma.wifiDevice.findUnique({ where: { id }, select: { id: true } })
  if (!device) return NextResponse.json({ error: 'device non trovato' }, { status: 404 })

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const cmd = await prisma.wifiDeviceCommand.create({
    data: { deviceId: id, action, payload, expiresAt },
  })

  return NextResponse.json({ ok: true, commandId: cmd.id })
}
