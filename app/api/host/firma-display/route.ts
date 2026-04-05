import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/firma-display?strutturaId=xxx
 * Ritorna lo stato corrente del display firma per la struttura.
 * Se c'è una prenotazione attiva, ritorna i dati per il display.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const strutturaId = req.nextUrl.searchParams.get('strutturaId')
  if (!strutturaId) return NextResponse.json({ error: 'strutturaId richiesto' }, { status: 400 })

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
    select: {
      firmaDisplayPrenotazioneId: true,
      firmaDisplayAttivaAt: true,
      nome: true,
      logo: true,
      colorePrimario: true,
      messaggioChiusura: true,
    },
  })

  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  // Se non c'è prenotazione attiva → display idle
  if (!struttura.firmaDisplayPrenotazioneId) {
    return NextResponse.json({
      stato: 'idle',
      struttura: { nome: struttura.nome, logo: struttura.logo, colorePrimario: struttura.colorePrimario, messaggioChiusura: struttura.messaggioChiusura },
    })
  }

  // Timeout: se attiva da più di 10 minuti, resetta
  if (struttura.firmaDisplayAttivaAt && Date.now() - struttura.firmaDisplayAttivaAt.getTime() > 10 * 60 * 1000) {
    await prisma.struttura.update({
      where: { id: strutturaId },
      data: { firmaDisplayPrenotazioneId: null, firmaDisplayAttivaAt: null },
    })
    return NextResponse.json({
      stato: 'idle',
      struttura: { nome: struttura.nome, logo: struttura.logo, colorePrimario: struttura.colorePrimario, messaggioChiusura: struttura.messaggioChiusura },
    })
  }

  // Carica dati prenotazione per il display
  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id: struttura.firmaDisplayPrenotazioneId },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      prezzoTotale: true,
      acconto: true,
      tassaSoggiorno: true,
      checkInToken: true,
      regCardFirmata: true,
      unita: { select: { nome: true } },
      addebiti: { select: { descrizione: true, totale: true } },
    },
  })

  if (!prenotazione) {
    // Prenotazione non trovata, resetta
    await prisma.struttura.update({
      where: { id: strutturaId },
      data: { firmaDisplayPrenotazioneId: null, firmaDisplayAttivaAt: null },
    })
    return NextResponse.json({ stato: 'idle', struttura: { nome: struttura.nome, logo: struttura.logo, colorePrimario: struttura.colorePrimario } })
  }

  const notti = prenotazione.dataPartenza
    ? Math.round((prenotazione.dataPartenza.getTime() - prenotazione.dataArrivo.getTime()) / 86400000)
    : 0
  const totaleExtra = prenotazione.addebiti.reduce((s, a) => s + a.totale, 0)
  const tassaTotale = (prenotazione.tassaSoggiorno ?? 0) * notti
  const totale = (prenotazione.prezzoTotale ?? 0) + totaleExtra + tassaTotale
  const saldo = totale - (prenotazione.acconto ?? 0)

  const baseUrl = (process.env.NEXTAUTH_URL ?? '').trim().replace(/\/+$/, '')

  return NextResponse.json({
    stato: 'attivo',
    struttura: { nome: struttura.nome, logo: struttura.logo, colorePrimario: struttura.colorePrimario, messaggioChiusura: struttura.messaggioChiusura },
    prenotazione: {
      id: prenotazione.id,
      guestNome: `${prenotazione.guestNome} ${prenotazione.guestCognome}`,
      camera: prenotazione.unita?.nome ?? null,
      notti,
      numOspiti: prenotazione.numOspiti,
      prezzoSoggiorno: prenotazione.prezzoTotale ?? 0,
      totaleExtra,
      tassaTotale,
      acconto: prenotazione.acconto ?? 0,
      totale,
      saldo,
      addebiti: prenotazione.addebiti,
      firmaUrl: prenotazione.checkInToken ? `${baseUrl}/kiosk/${prenotazione.checkInToken}?tipo=checkin` : null,
      regCardFirmata: prenotazione.regCardFirmata,
    },
  })
}

/**
 * POST /api/host/firma-display
 * Attiva il display firma per una prenotazione.
 * Body: { strutturaId, prenotazioneId } — attiva
 * Body: { strutturaId, reset: true } — resetta a idle
 */
export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { strutturaId, prenotazioneId, reset } = await req.json()
  if (!strutturaId) return NextResponse.json({ error: 'strutturaId richiesto' }, { status: 400 })

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  if (reset) {
    await prisma.struttura.update({
      where: { id: strutturaId },
      data: { firmaDisplayPrenotazioneId: null, firmaDisplayAttivaAt: null },
    })
    return NextResponse.json({ ok: true, stato: 'idle' })
  }

  if (!prenotazioneId) return NextResponse.json({ error: 'prenotazioneId richiesto' }, { status: 400 })

  // Genera checkInToken se non esiste
  const pren = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId: auth.user.hostId },
    select: { id: true, checkInToken: true },
  })
  if (!pren) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })

  if (!pren.checkInToken) {
    const { randomUUID } = await import('crypto')
    await prisma.prenotazione.update({
      where: { id: prenotazioneId },
      data: { checkInToken: randomUUID() },
    })
  }

  await prisma.struttura.update({
    where: { id: strutturaId },
    data: { firmaDisplayPrenotazioneId: prenotazioneId, firmaDisplayAttivaAt: new Date() },
  })

  return NextResponse.json({ ok: true, stato: 'attivo' })
}
