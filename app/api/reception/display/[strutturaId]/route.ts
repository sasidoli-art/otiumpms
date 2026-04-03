import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/reception/display/[strutturaId]
 * Endpoint PUBBLICO — usato dal tablet display in reception.
 * Ritorna lo stato corrente (idle o attivo con dati prenotazione).
 */
export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const { strutturaId } = await paramsPromise

  const struttura = await prisma.struttura.findUnique({
    where: { id: strutturaId },
    select: {
      firmaDisplayPrenotazioneId: true,
      firmaDisplayAttivaAt: true,
      nome: true,
      logo: true,
      colorePrimario: true,
      messaggioChiusura: true,
    },
  })

  if (!struttura) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  // Idle
  if (!struttura.firmaDisplayPrenotazioneId) {
    return NextResponse.json({
      stato: 'idle',
      struttura: { nome: struttura.nome, logo: struttura.logo, colorePrimario: struttura.colorePrimario, messaggioChiusura: struttura.messaggioChiusura },
    })
  }

  // Timeout 10 minuti
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
    stato: prenotazione.regCardFirmata ? 'firmato' : 'attivo',
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
