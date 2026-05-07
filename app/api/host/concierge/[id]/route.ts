import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params: pp }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await pp

  const conv = await prisma.conversazioneWhatsApp.findFirst({
    where: { id, hostId: auth.user.hostId },
    include: {
      messaggi: { orderBy: { createdAt: 'asc' } },
      azioni: { orderBy: { createdAt: 'desc' } },
      prenotazione: { select: { id: true, guestNome: true, guestCognome: true, dataArrivo: true, dataPartenza: true, unita: { select: { nome: true } } } },
    },
  })

  if (!conv) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  return NextResponse.json(conv)
}

export async function PATCH(req: NextRequest, { params: pp }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await pp
  const body = await req.json()

  const conv = await prisma.conversazioneWhatsApp.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!conv) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.stato) data.stato = body.stato

  const updated = await prisma.conversazioneWhatsApp.update({ where: { id }, data })
  return NextResponse.json(updated)
}
