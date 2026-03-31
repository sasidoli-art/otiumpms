import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseModuli } from '@/lib/moduli'

/**
 * PATCH /api/superadmin/host/[id]/config
 * SuperAdmin aggiorna config di un host (moduli, concierge, ecc.)
 * Body: { moduliAttivi?: Record<string,boolean>, conciergeAttivo?: boolean, ... }
 */
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = await paramsPromise
  const host = await prisma.host.findUnique({ where: { id }, select: { id: true, moduliAttivi: true } })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  // Aggiorna moduli
  if (body.moduliAttivi) {
    const attuali = parseModuli(host.moduliAttivi)
    const nuovi = { ...attuali, ...body.moduliAttivi }
    data.moduliAttivi = nuovi
  }

  // Aggiorna flag concierge
  if (body.conciergeAttivo !== undefined) {
    data.conciergeAttivo = body.conciergeAttivo
  }

  const updated = await prisma.host.update({
    where: { id },
    data,
    select: { id: true, moduliAttivi: true, conciergeAttivo: true },
  })

  return NextResponse.json(updated)
}
