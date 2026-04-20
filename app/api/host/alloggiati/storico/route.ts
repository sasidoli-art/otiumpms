import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'

// GET /api/host/alloggiati/storico?strutturaId=xxx
// Ultimi 30 export per la struttura.
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const strutturaId = searchParams.get('strutturaId')
  if (!strutturaId) {
    return NextResponse.json({ error: 'strutturaId richiesto' }, { status: 400 })
  }

  const storico = await prisma.exportAlloggiati.findMany({
    where: { hostId: auth.user.hostId, strutturaId },
    select: {
      id: true,
      dataExport: true,
      numOspiti: true,
      numAccompagnatori: true,
      numIncompleti: true,
      fileNome: true,
      esportatoDa: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return NextResponse.json({ storico })
}
