import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * DELETE /api/host/wifi/access-codes/[id]
 * Revoca un codice walk-in (soft delete, imposta revocatoAt).
 */
export async function DELETE(_req: NextRequest, { params: paramsPromise }: RouteParams) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise

  const code = await prisma.wifiAccessCode.findUnique({
    where: { id },
    select: { hostId: true, revocatoAt: true },
  })
  if (!code || code.hostId !== auth.user.hostId) {
    return NextResponse.json({ error: 'Codice non trovato' }, { status: 404 })
  }
  if (code.revocatoAt) {
    return NextResponse.json({ error: 'Gia revocato' }, { status: 409 })
  }

  await prisma.wifiAccessCode.update({
    where: { id },
    data: { revocatoAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
