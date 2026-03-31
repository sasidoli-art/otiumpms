import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const stato = sp.get('stato')

  const conversazioni = await prisma.conversazioneWhatsApp.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(stato ? { stato: stato as 'ATTIVA' | 'ESCALATA' | 'CHIUSA' } : {}),
    },
    include: {
      prenotazione: { select: { id: true, guestNome: true, guestCognome: true, unita: { select: { nome: true } } } },
      _count: { select: { messaggi: true, azioni: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })

  const kpi = {
    attive: await prisma.conversazioneWhatsApp.count({ where: { hostId: auth.user.hostId, stato: 'ATTIVA' } }),
    escalate: await prisma.conversazioneWhatsApp.count({ where: { hostId: auth.user.hostId, stato: 'ESCALATA' } }),
    totali: conversazioni.length,
  }

  return NextResponse.json({ conversazioni, kpi })
}
