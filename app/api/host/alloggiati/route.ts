import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import {
  validaPrenotazioneAlloggiati,
  validaAccompagnatoreAlloggiati,
} from '@/lib/alloggiati'

// GET /api/host/alloggiati?strutturaId=xxx&data=YYYY-MM-DD
//   (opzionale: ?da=YYYY-MM-DD&a=YYYY-MM-DD per range)
// Ritorna le prenotazioni del giorno con stato di completezza dati.
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const strutturaId = searchParams.get('strutturaId')
  const data = searchParams.get('data')
  const da = searchParams.get('da') ?? data
  const a = searchParams.get('a') ?? data

  if (!strutturaId) {
    return NextResponse.json({ error: 'strutturaId richiesto' }, { status: 400 })
  }
  if (!da || !a) {
    return NextResponse.json({ error: 'data richiesta (YYYY-MM-DD)' }, { status: 400 })
  }

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
    select: {
      id: true, nome: true,
      alloggiatiAbilitato: true,
      alloggiatiCodiceStruttura: true,
      alloggiatiComuneIstat: true,
      alloggiatiDenominazioneComune: true,
    },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  // Data range: default = singolo giorno
  const dataInizio = new Date(da)
  dataInizio.setHours(0, 0, 0, 0)
  const dataFine = new Date(a)
  dataFine.setHours(23, 59, 59, 999)

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: auth.user.hostId,
      strutturaId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      dataArrivo: { gte: dataInizio, lte: dataFine },
      deletedAt: null,
    },
    select: {
      id: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      guestTelefono: true,
      guestSesso: true,
      guestDataNascita: true,
      guestLuogoNascita: true,
      guestComuneNascitaIstat: true,
      guestProvinciaNascita: true,
      guestStatoNascitaIstat: true,
      guestCittadinanzaIstat: true,
      guestTipoDocumento: true,
      guestNumeroDocumento: true,
      guestLuogoRilascio: true,
      guestComuneRilascioIstat: true,
      guestProvinciaRilascio: true,
      unita: { select: { nome: true } },
      accompagnatori: {
        select: {
          id: true,
          nome: true, cognome: true, sesso: true, dataNascita: true,
          luogoNascita: true, provinciaNascita: true,
          comuneNascitaIstat: true, statoNascitaIstat: true, cittadinanzaIstat: true,
          tipoDocumento: true, numeroDocumento: true,
          comuneRilascioIstat: true, provinciaRilascio: true,
          isMinore: true,
        },
      },
    },
    orderBy: { dataArrivo: 'asc' },
  })

  const risultati = prenotazioni.map((p) => {
    const validaz = validaPrenotazioneAlloggiati(p)
    // Dati minimi: se manca anche solo cognome/numero documento — "mancante"
    const datiMinimi = Boolean(p.guestCognome?.trim() && p.guestNome?.trim() && p.guestNumeroDocumento?.trim())
    const stato: 'completo' | 'incompleto' | 'mancante' = !datiMinimi
      ? 'mancante'
      : validaz.valido ? 'completo' : 'incompleto'

    const accompagnatori = p.accompagnatori.map((a) => {
      const v = validaAccompagnatoreAlloggiati(a)
      const min = Boolean(a.cognome?.trim() && a.nome?.trim() && a.numeroDocumento?.trim())
      const sAcc: 'completo' | 'incompleto' | 'mancante' = !min
        ? 'mancante'
        : v.valido ? 'completo' : 'incompleto'
      return {
        ...a,
        dataNascita: a.dataNascita?.toISOString() ?? null,
        stato: sAcc,
        campiMancanti: v.campiMancanti,
      }
    })

    return {
      id: p.id,
      dataArrivo: p.dataArrivo.toISOString(),
      dataPartenza: p.dataPartenza?.toISOString() ?? null,
      numOspiti: p.numOspiti,
      guestNome: p.guestNome,
      guestCognome: p.guestCognome,
      guestEmail: p.guestEmail,
      guestTelefono: p.guestTelefono,
      guestSesso: p.guestSesso,
      guestDataNascita: p.guestDataNascita?.toISOString() ?? null,
      guestLuogoNascita: p.guestLuogoNascita,
      guestComuneNascitaIstat: p.guestComuneNascitaIstat,
      guestProvinciaNascita: p.guestProvinciaNascita,
      guestStatoNascitaIstat: p.guestStatoNascitaIstat,
      guestCittadinanzaIstat: p.guestCittadinanzaIstat,
      guestTipoDocumento: p.guestTipoDocumento,
      guestNumeroDocumento: p.guestNumeroDocumento,
      guestLuogoRilascio: p.guestLuogoRilascio,
      guestComuneRilascioIstat: p.guestComuneRilascioIstat,
      guestProvinciaRilascio: p.guestProvinciaRilascio,
      unitaNome: p.unita?.nome ?? null,
      accompagnatori,
      stato,
      campiMancanti: validaz.campiMancanti,
    }
  })

  return NextResponse.json({
    struttura,
    data: da,
    ospiti: risultati,
    totale: risultati.length,
    completi: risultati.filter((r) => r.stato === 'completo').length,
    incompleti: risultati.filter((r) => r.stato === 'incompleto').length,
    mancanti: risultati.filter((r) => r.stato === 'mancante').length,
  })
}
