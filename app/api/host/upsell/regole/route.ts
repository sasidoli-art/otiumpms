import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const regole = await prisma.regolaUpsell.findMany({
    where: { hostId: auth.user.hostId },
    include: { struttura: { select: { nome: true } }, _count: { select: { proposte: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(regole)
}

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const body = await req.json()
  const { nome, strutturaId, daUnitaId, aUnitaId, tipoSupplemento, supplemento, incentivo, incentivoPct, maxOccupazione, maxNotti, soloCheckIn } = body
  if (!nome || !aUnitaId) return NextResponse.json({ error: 'nome e aUnitaId obbligatori' }, { status: 400 })
  const regola = await prisma.regolaUpsell.create({
    data: {
      hostId: auth.user.hostId, nome, strutturaId: strutturaId || null, daUnitaId: daUnitaId || null, aUnitaId,
      tipoSupplemento: tipoSupplemento || 'FISSO', supplemento: supplemento ?? 0,
      incentivo: incentivo ?? 0, incentivoPct: incentivoPct ?? null,
      maxOccupazione: maxOccupazione ?? 80, maxNotti: maxNotti ?? null, soloCheckIn: soloCheckIn ?? true,
    },
  })
  return NextResponse.json(regola, { status: 201 })
}
