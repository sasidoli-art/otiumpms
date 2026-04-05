import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/biancheria/dotazione — config dotazione biancheria per camera
 * POST — aggiungi/modifica dotazione
 */
export async function GET(_: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const dotazioni = await prisma.dotazioneBiancheria.findMany({
    where: { hostId: auth.user.hostId },
    include: { unita: { select: { nome: true } } },
    orderBy: [{ categoria: 'asc' }, { articolo: 'asc' }],
  })

  return NextResponse.json(dotazioni)
}

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { articolo, quantitaPerOspite, quantitaFissa, categoria, unitaId } = body

  if (!articolo) return NextResponse.json({ error: 'Articolo obbligatorio' }, { status: 400 })

  const dotazione = await prisma.dotazioneBiancheria.create({
    data: {
      hostId: auth.user.hostId,
      unitaId: unitaId || null,
      articolo,
      quantitaPerOspite: quantitaPerOspite ?? 1,
      quantitaFissa: quantitaFissa ?? 0,
      categoria: categoria || 'BIANCHERIA',
    },
  })

  return NextResponse.json(dotazione, { status: 201 })
}
