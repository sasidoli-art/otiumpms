import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfDay, endOfDay } from 'date-fns'

/**
 * GET /api/reception/spa-concierge/[strutturaId]
 * Pubblico — lista appuntamenti di oggi per il tablet SPA Concierge.
 */
export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const { strutturaId } = await paramsPromise

  const struttura = await prisma.struttura.findUnique({
    where: { id: strutturaId },
    select: { id: true, nome: true, logo: true, colorePrimario: true, hostId: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const oggi = new Date()

  const appuntamenti = await prisma.appuntamentoSpa.findMany({
    where: {
      hostId: struttura.hostId,
      dataOra: { gte: startOfDay(oggi), lte: endOfDay(oggi) },
      stato: { in: ['CONFERMATO', 'PRENOTATO', 'IN_CORSO'] },
    },
    orderBy: { dataOra: 'asc' },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      dataOra: true,
      durata: true,
      stato: true,
      note: true,
      checkInSpa: true,
      trattamento: { select: { nome: true } },
      percorso: { select: { nome: true } },
      cabina: { select: { id: true, nome: true } },
      terapista: { select: { nome: true } },
      waiver: { select: { confermato: true } },
      prenotazione: { select: { guestNome: true, guestCognome: true, unita: { select: { nome: true } } } },
    },
  })

  return NextResponse.json({
    struttura: { nome: struttura.nome, logo: struttura.logo, colorePrimario: struttura.colorePrimario },
    appuntamenti: appuntamenti.map(a => ({
      id: a.id,
      guestNome: `${a.guestNome} ${a.guestCognome ?? ''}`.trim(),
      guestEmail: a.guestEmail,
      orario: a.dataOra,
      durata: a.durata,
      stato: a.stato,
      servizio: a.trattamento?.nome ?? a.percorso?.nome ?? 'Trattamento',
      cabina: a.cabina?.nome ?? null,
      cabinaId: a.cabina?.id ?? null,
      terapista: a.terapista?.nome ?? null,
      note: a.note,
      camera: a.prenotazione?.unita?.nome ?? null,
      wellnessCardCompilata: a.waiver?.confermato ?? false,
      checkedIn: a.checkInSpa ?? false,
    })),
  })
}

/**
 * POST /api/reception/spa-concierge/[strutturaId]
 * Check-in SPA: segna l'ospite come arrivato.
 * Body: { appuntamentoId }
 */
export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const { strutturaId } = await paramsPromise
  const { appuntamentoId } = await req.json()

  if (!appuntamentoId) return NextResponse.json({ error: 'appuntamentoId richiesto' }, { status: 400 })

  const struttura = await prisma.struttura.findUnique({ where: { id: strutturaId }, select: { hostId: true } })
  if (!struttura) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  await prisma.appuntamentoSpa.update({
    where: { id: appuntamentoId },
    data: { checkInSpa: true, stato: 'IN_CORSO' },
  })

  return NextResponse.json({ ok: true })
}
