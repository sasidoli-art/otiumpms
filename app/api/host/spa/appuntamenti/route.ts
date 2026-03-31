import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { sendEmailConfermaAppuntamentoSpa } from '@/lib/email'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const data = sp.get('data')       // YYYY-MM-DD
  const terapistaId = sp.get('terapistaId')
  const cabinaId = sp.get('cabinaId')
  const stato = sp.get('stato')
  const prenotazioneId = sp.get('prenotazioneId')

  const where: Record<string, unknown> = { hostId: auth.user.hostId }

  if (data) {
    const giorno = new Date(data)
    const fine = new Date(data)
    fine.setDate(fine.getDate() + 1)
    where.dataOra = { gte: giorno, lt: fine }
  }
  if (terapistaId) where.terapistaId = terapistaId
  if (cabinaId) where.cabinaId = cabinaId
  if (stato) where.stato = stato
  if (prenotazioneId) where.prenotazioneId = prenotazioneId

  const appuntamenti = await prisma.appuntamentoSpa.findMany({
    where,
    include: {
      terapista: { select: { id: true, nome: true, cognome: true, colore: true } },
      cabina: { select: { id: true, nome: true, colore: true } },
      trattamento: { select: { id: true, nome: true, categoria: true, durata: true, colore: true } },
      percorso: { select: { id: true, nome: true, durataMinuti: true } },
      ospite: { select: { id: true, nome: true, cognome: true, email: true } },
    },
    orderBy: { dataOra: 'asc' },
  })

  return NextResponse.json(appuntamenti)
}

export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const {
    guestNome, guestCognome, guestEmail, guestTelefono,
    ospiteId, prenotazioneId,
    cabinaId, terapistaId,
    trattamentoId, percorsoId,
    dataOra, durata, prezzoTotale, note,
  } = body

  if (!guestNome || !guestCognome) {
    return NextResponse.json({ error: 'Nome e cognome ospite sono obbligatori' }, { status: 422 })
  }
  if (!dataOra) {
    return NextResponse.json({ error: 'Data e ora sono obbligatorie' }, { status: 422 })
  }
  if (!durata || Number(durata) <= 0) {
    return NextResponse.json({ error: 'Durata non valida' }, { status: 422 })
  }
  if (!trattamentoId && !percorsoId) {
    return NextResponse.json({ error: 'Seleziona un trattamento o un percorso' }, { status: 422 })
  }

  const appuntamento = await prisma.appuntamentoSpa.create({
    data: {
      hostId: auth.user.hostId,
      guestNome: guestNome.trim(),
      guestCognome: guestCognome.trim(),
      guestEmail: guestEmail?.trim() || null,
      guestTelefono: guestTelefono?.trim() || null,
      ospiteId: ospiteId || null,
      prenotazioneId: prenotazioneId || null,
      cabinaId: cabinaId || null,
      terapistaId: terapistaId || null,
      trattamentoId: trattamentoId || null,
      percorsoId: percorsoId || null,
      dataOra: new Date(dataOra),
      durata: Number(durata),
      prezzoTotale: prezzoTotale ? Number(prezzoTotale) : null,
      note: note?.trim() || null,
    },
    include: {
      terapista: { select: { id: true, nome: true, cognome: true, colore: true } },
      cabina: { select: { id: true, nome: true, colore: true } },
      trattamento: { select: { id: true, nome: true, categoria: true, durata: true } },
      percorso: { select: { id: true, nome: true } },
    },
  })

  // ── Email conferma all'ospite (non bloccante) ──────────────────────────────
  if (appuntamento.guestEmail) {
    const servizioNome = appuntamento.trattamento?.nome ?? appuntamento.percorso?.nome ?? 'Trattamento SPA'
    prisma.host.findUnique({ where: { id: auth.user.hostId }, select: { nomeAzienda: true } })
      .then(host => sendEmailConfermaAppuntamentoSpa({
        guestEmail: appuntamento.guestEmail!,
        guestNome: appuntamento.guestNome,
        hostNome: host?.nomeAzienda ?? 'SPA',
        servizioNome,
        dataOra: new Date(appuntamento.dataOra),
        durata: appuntamento.durata,
        prezzoTotale: appuntamento.prezzoTotale,
      }))
      .catch(err => logger.error('Email conferma SPA (backoffice) fallita', 'host/spa/appuntamenti', { error: String(err) }))
  }

  return NextResponse.json(appuntamento, { status: 201 })
}

