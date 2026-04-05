import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({ where: { id: auth.user.hostId }, select: { moduliAttivi: true } })
  if (!isModuloAttivo(host?.moduliAttivi, 'lostFound')) {
    return NextResponse.json({ error: 'Modulo non attivo' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const stato = sp.get('stato')

  const oggetti = await prisma.oggettoSmarrito.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(stato ? { stato: stato as 'IN_CUSTODIA' | 'RESTITUITO' | 'SPEDITO' | 'NON_RECLAMATO' | 'SMALTITO' } : {}),
    },
    include: { prenotazione: { select: { id: true, guestNome: true, guestCognome: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const kpi = {
    inCustodia: await prisma.oggettoSmarrito.count({ where: { hostId: auth.user.hostId, stato: 'IN_CUSTODIA' } }),
    restituiti: await prisma.oggettoSmarrito.count({ where: { hostId: auth.user.hostId, stato: 'RESTITUITO' } }),
    totale: oggetti.length,
  }

  return NextResponse.json({ oggetti, kpi })
}

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({ where: { id: auth.user.hostId }, select: { moduliAttivi: true } })
  if (!isModuloAttivo(host?.moduliAttivi, 'lostFound')) {
    return NextResponse.json({ error: 'Modulo non attivo' }, { status: 403 })
  }

  const body = await req.json()
  const { descrizione, categoria, luogoRitrovamento, trovatoDa, proprietarioNome, proprietarioEmail, proprietarioTelefono, prenotazioneId, luogoCustodia, note } = body

  if (!descrizione) return NextResponse.json({ error: 'Descrizione obbligatoria' }, { status: 400 })

  const oggetto = await prisma.oggettoSmarrito.create({
    data: {
      hostId: auth.user.hostId,
      descrizione,
      categoria: categoria || 'ALTRO',
      luogoRitrovamento: luogoRitrovamento || null,
      trovatoDa: trovatoDa || null,
      proprietarioNome: proprietarioNome || null,
      proprietarioEmail: proprietarioEmail || null,
      proprietarioTelefono: proprietarioTelefono || null,
      prenotazioneId: prenotazioneId || null,
      luogoCustodia: luogoCustodia || null,
      note: note || null,
    },
  })

  return NextResponse.json(oggetto, { status: 201 })
}
