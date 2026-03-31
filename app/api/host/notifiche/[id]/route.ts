import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user.hostId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await paramsPromise

  const notifica = await prisma.notifica.findFirst({
    where: { id, hostId: session.user.hostId },
  })
  if (!notifica) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.notifica.update({
    where: { id },
    data: { letta: true },
  })
  return NextResponse.json(updated)
}
