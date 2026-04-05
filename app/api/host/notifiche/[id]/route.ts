import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

export async function PATCH(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise

  const notifica = await prisma.notifica.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!notifica) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.notifica.update({
    where: { id },
    data: { letta: true },
  })
  return NextResponse.json(updated)
}
