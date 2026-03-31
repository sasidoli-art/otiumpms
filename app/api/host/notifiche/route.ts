import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ─── GET: elenco notifiche con paginazione e filtri ───────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.hostId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const hostId = session.user.hostId

  const sp = req.nextUrl.searchParams
  const limit = Math.min(Number(sp.get('limit') ?? '30'), 100)
  const offset = Number(sp.get('offset') ?? '0')
  const tipo = sp.get('tipo') ?? ''
  const soloNonLette = sp.get('nonLette') === 'true'

  const where: Record<string, unknown> = { hostId }
  if (tipo) where.tipo = tipo
  if (soloNonLette) where.letta = false

  const [notifiche, totale, nonLette] = await Promise.all([
    prisma.notifica.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notifica.count({ where }),
    prisma.notifica.count({ where: { hostId, letta: false } }),
  ])

  return NextResponse.json({ notifiche, nonLette, totale })
}

// ─── DELETE: segna tutte come lette o pulizia archivio ────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user.hostId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  if (searchParams.get('leggiTutte') === 'true') {
    await prisma.notifica.updateMany({
      where: { hostId: session.user.hostId, letta: false },
      data: { letta: true },
    })
    return NextResponse.json({ ok: true })
  }

  // Elimina tutte le lette (pulizia archivio)
  const result = await prisma.notifica.deleteMany({
    where: { hostId: session.user.hostId, letta: true },
  })
  return NextResponse.json({ ok: true, eliminate: result.count })
}
