import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiApiKey, isAuthError } from '@/lib/wifi/public-auth'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/public/wifi/codes/[id]
 * Scope: codes:write
 * Revoca soft (imposta revocatoAt).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWifiApiKey(req, 'codes:write')
  if (isAuthError(auth)) return auth

  const { id } = await params

  const code = await prisma.wifiAccessCode.findUnique({
    where: { id },
    select: { hostId: true, revocatoAt: true },
  })
  if (!code || code.hostId !== auth.hostId) {
    return NextResponse.json({ error: 'Code not found' }, { status: 404 })
  }
  if (code.revocatoAt) {
    return NextResponse.json({ error: 'Already revoked' }, { status: 409 })
  }

  await prisma.wifiAccessCode.update({
    where: { id },
    data: { revocatoAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
