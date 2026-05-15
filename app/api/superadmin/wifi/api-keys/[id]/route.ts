import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'

/**
 * DELETE /api/superadmin/wifi/api-keys/[id]
 * Revoca soft (revocatoAt = now). La key non funziona più al prossimo check.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await params

  const key = await prisma.wifiApiKey.findUnique({ where: { id }, select: { revokedAt: true } })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (key.revokedAt) return NextResponse.json({ error: 'Already revoked' }, { status: 409 })

  await prisma.wifiApiKey.update({ where: { id }, data: { revokedAt: new Date() } })

  return NextResponse.json({ ok: true })
}
