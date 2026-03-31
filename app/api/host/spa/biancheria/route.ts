import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, addDays, format } from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * GET /api/host/spa/biancheria?data=2026-04-01
 * Calcola biancheria SPA necessaria per gli appuntamenti di una data.
 * Basato su: appuntamenti del giorno × dotazione per cabina.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const dataStr = req.nextUrl.searchParams.get('data') || format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const data = new Date(dataStr + 'T12:00')
  const giorno = startOfDay(data)
  const fineGiorno = endOfDay(data)

  // Appuntamenti del giorno con cabina
  const appuntamenti = await prisma.appuntamentoSpa.findMany({
    where: {
      hostId: auth.user.hostId,
      stato: { in: ['CONFERMATO', 'PRENOTATO'] },
      dataOra: { gte: giorno, lte: fineGiorno },
      cabinaId: { not: null },
    },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      dataOra: true,
      durata: true,
      cabinaId: true,
      cabina: {
        select: {
          id: true, nome: true,
          dotazioneAsciugamaniGrandi: true, dotazioneAsciugamaniPiccoli: true,
          dotazioneAccappatoi: true, dotazioneLenzuolaLettino: true,
          dotazioneCiabatte: true, dotazioneTappetini: true,
        },
      },
      trattamento: { select: { nome: true } },
      terapista: { select: { nome: true, cognome: true } },
    },
    orderBy: { dataOra: 'asc' },
  })

  // Calcola biancheria per ogni appuntamento
  const dettaglio = appuntamenti.map(a => {
    const cab = a.cabina
    return {
      appuntamentoId: a.id,
      orario: format(new Date(a.dataOra), 'HH:mm'),
      ospite: `${a.guestCognome} ${a.guestNome}`,
      cabina: cab?.nome || '—',
      trattamento: a.trattamento?.nome || '—',
      terapista: a.terapista ? `${a.terapista.nome} ${a.terapista.cognome}` : '—',
      biancheria: cab ? {
        asciugamaniGrandi: cab.dotazioneAsciugamaniGrandi,
        asciugamaniPiccoli: cab.dotazioneAsciugamaniPiccoli,
        accappatoi: cab.dotazioneAccappatoi,
        lenzuolaLettino: cab.dotazioneLenzuolaLettino,
        ciabatte: cab.dotazioneCiabatte,
        tappetini: cab.dotazioneTappetini,
      } : null,
    }
  })

  // Totali
  const totali = {
    asciugamaniGrandi: dettaglio.reduce((s, d) => s + (d.biancheria?.asciugamaniGrandi || 0), 0),
    asciugamaniPiccoli: dettaglio.reduce((s, d) => s + (d.biancheria?.asciugamaniPiccoli || 0), 0),
    accappatoi: dettaglio.reduce((s, d) => s + (d.biancheria?.accappatoi || 0), 0),
    lenzuolaLettino: dettaglio.reduce((s, d) => s + (d.biancheria?.lenzuolaLettino || 0), 0),
    ciabatte: dettaglio.reduce((s, d) => s + (d.biancheria?.ciabatte || 0), 0),
    tappetini: dettaglio.reduce((s, d) => s + (d.biancheria?.tappetini || 0), 0),
  }

  // Stato HK cabine
  const cabine = await prisma.cabinaSpa.findMany({
    where: { hostId: auth.user.hostId, attiva: true },
    select: { id: true, nome: true, statoHK: true, ultimaPulizia: true, noteHK: true },
  })

  return NextResponse.json({
    data: dataStr,
    appuntamentiTotali: appuntamenti.length,
    dettaglio,
    totali,
    cabine,
  })
}
