import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { calcolaUpgradeDisponibili } from '@/lib/upsell'
import { audit } from '@/lib/audit'

/**
 * GET /api/host/upsell/proponi?prenotazioneId=xxx
 * Calcola gli upgrade disponibili per una prenotazione.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const prenotazioneId = req.nextUrl.searchParams.get('prenotazioneId')
  if (!prenotazioneId) return NextResponse.json({ error: 'prenotazioneId obbligatorio' }, { status: 400 })
  const upgrade = await calcolaUpgradeDisponibili(auth.user.hostId, prenotazioneId)
  return NextResponse.json(upgrade)
}

/**
 * POST /api/host/upsell/proponi
 * Registra una proposta di upsell (accettata o rifiutata).
 * Body: { prenotazioneId, regolaId, stato: "ACCETTATA"|"RIFIUTATA", rispostaOspite? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { prenotazioneId, regolaId, stato, rispostaOspite } = body

  if (!prenotazioneId || !regolaId || !stato) {
    return NextResponse.json({ error: 'prenotazioneId, regolaId, stato obbligatori' }, { status: 400 })
  }

  const regola = await prisma.regolaUpsell.findFirst({ where: { id: regolaId, hostId: auth.user.hostId } })
  if (!regola) return NextResponse.json({ error: 'Regola non trovata' }, { status: 404 })

  const pren = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId: auth.user.hostId },
    select: { id: true, unitaId: true, dataArrivo: true, dataPartenza: true, unita: { select: { nome: true } } },
  })
  if (!pren) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })

  const target = await prisma.unitaPrenotabile.findUnique({
    where: { id: regola.aUnitaId },
    select: { nome: true, prezzoBase: true },
  })

  const notti = pren.dataPartenza
    ? Math.max(1, Math.round((new Date(pren.dataPartenza).getTime() - new Date(pren.dataArrivo).getTime()) / 86400000))
    : 1

  let supplementoNotte = regola.supplemento
  if (regola.tipoSupplemento === 'PERCENTUALE' && target) {
    supplementoNotte = (target.prezzoBase * regola.supplemento) / 100
  }
  const supplementoTotale = Math.round(supplementoNotte * notti * 100) / 100
  let incentivo = regola.incentivo
  if (regola.incentivoPct) incentivo = Math.round(supplementoTotale * regola.incentivoPct / 100 * 100) / 100

  const proposta = await prisma.propostaUpsell.create({
    data: {
      regolaId,
      prenotazioneId,
      daCameraNome: pren.unita?.nome || '—',
      aCameraNome: target?.nome || '—',
      supplementoNotte,
      supplementoTotale,
      stato,
      propostaDa: auth.user.name || auth.user.email,
      rispostaOspite: rispostaOspite || null,
      incentivoOperatore: stato === 'ACCETTATA' ? incentivo : 0,
      accettatoAt: stato === 'ACCETTATA' ? new Date() : null,
    },
  })

  // Se accettata, cambia camera
  if (stato === 'ACCETTATA') {
    await prisma.prenotazione.update({
      where: { id: prenotazioneId },
      data: { unitaId: regola.aUnitaId },
    })
  }

  await audit({
    hostId: auth.user.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: `upsell.${stato.toLowerCase()}`,
    entita: 'prenotazione',
    entitaId: prenotazioneId,
    dettagli: `Upsell ${regola.nome}: ${pren.unita?.nome} → ${target?.nome} (+€${supplementoTotale}) — ${stato}`,
  })

  return NextResponse.json(proposta, { status: 201 })
}
