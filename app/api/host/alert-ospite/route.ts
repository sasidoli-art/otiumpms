import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import { notDeleted } from '@/lib/prisma-helpers'

/**
 * GET /api/host/alert-ospite?prenotazioneId=xxx&trigger=CHECKIN
 * Lista alert per una prenotazione o per trigger evento.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const prenotazioneId = sp.get('prenotazioneId')
  const trigger = sp.get('trigger')

  const alerts = await prisma.alertOspite.findMany({
    where: {
      prenotazione: { hostId: auth.user.hostId },
      ...(prenotazioneId ? { prenotazioneId } : {}),
      ...(trigger ? { triggerEvento: trigger } : {}),
      attivo: true,
    },
    include: {
      prenotazione: {
        select: { id: true, guestNome: true, guestCognome: true, unita: { select: { nome: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(alerts)
}

/**
 * POST /api/host/alert-ospite
 * Crea un alert per una prenotazione.
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({ where: { id: auth.user.hostId }, select: { moduliAttivi: true } })
  if (!isModuloAttivo(host?.moduliAttivi, 'alertOspite')) {
    return NextResponse.json({ error: 'Modulo non attivo' }, { status: 403 })
  }

  const body = await req.json()
  const { prenotazioneId, messaggio, tipo, triggerEvento } = body

  if (!prenotazioneId || !messaggio || !triggerEvento) {
    return NextResponse.json({ error: 'prenotazioneId, messaggio e triggerEvento obbligatori' }, { status: 400 })
  }

  // Verifica ownership
  const pren = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId: auth.user.hostId, ...notDeleted },
    select: { id: true },
  })
  if (!pren) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })

  const alert = await prisma.alertOspite.create({
    data: {
      hostId: auth.user.hostId,
      prenotazioneId,
      messaggio,
      tipo: tipo || 'INFO',
      triggerEvento,
    },
  })

  return NextResponse.json(alert, { status: 201 })
}
