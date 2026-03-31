import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { generateAlloggiatiFile, validateGuest, type AlloggiatiGuest } from '@/lib/alloggiati'

// GET /api/host/alloggiati?strutturaId=xxx&da=2026-03-01&a=2026-03-31
// Restituisce le prenotazioni con stato validazione per Alloggiati Web
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const strutturaId = searchParams.get('strutturaId')
  const da = searchParams.get('da')
  const a = searchParams.get('a')

  if (!strutturaId || !da || !a) {
    return NextResponse.json({ error: 'Parametri mancanti: strutturaId, da, a' }, { status: 400 })
  }

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: auth.user.hostId,
      strutturaId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      dataArrivo: { gte: new Date(da), lte: new Date(a) },
    },
    select: {
      id: true,
      dataArrivo: true,
      dataPartenza: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
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
    },
    orderBy: { dataArrivo: 'asc' },
  })

  const risultati = prenotazioni.map(p => {
    const validazione = validateGuest(p as AlloggiatiGuest)
    return {
      id: p.id,
      guestNome: p.guestNome,
      guestCognome: p.guestCognome,
      guestEmail: p.guestEmail,
      dataArrivo: p.dataArrivo,
      dataPartenza: p.dataPartenza,
      unitaNome: p.unita?.nome ?? null,
      guestSesso: p.guestSesso,
      guestDataNascita: p.guestDataNascita,
      guestTipoDocumento: p.guestTipoDocumento,
      guestNumeroDocumento: p.guestNumeroDocumento,
      valido: validazione.valid,
      campiMancanti: validazione.campiMancanti,
    }
  })

  return NextResponse.json({
    struttura: {
      id: struttura.id,
      nome: struttura.nome,
      alloggiatiAbilitato: struttura.alloggiatiAbilitato,
      alloggiatiCodiceStruttura: struttura.alloggiatiCodiceStruttura,
    },
    ospiti: risultati,
    totale: risultati.length,
    validi: risultati.filter(r => r.valido).length,
    nonValidi: risultati.filter(r => !r.valido).length,
  })
}

// POST /api/host/alloggiati — genera e scarica il file .txt
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { strutturaId, da, a } = body

  if (!strutturaId || !da || !a) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
  })
  if (!struttura || !struttura.alloggiatiCodiceStruttura) {
    return NextResponse.json(
      { error: 'Struttura non trovata o codice Alloggiati non configurato' },
      { status: 400 },
    )
  }

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: auth.user.hostId,
      strutturaId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      dataArrivo: { gte: new Date(da), lte: new Date(a) },
    },
    select: {
      dataArrivo: true,
      dataPartenza: true,
      guestNome: true,
      guestCognome: true,
      guestSesso: true,
      guestDataNascita: true,
      guestComuneNascitaIstat: true,
      guestProvinciaNascita: true,
      guestStatoNascitaIstat: true,
      guestCittadinanzaIstat: true,
      guestTipoDocumento: true,
      guestNumeroDocumento: true,
      guestComuneRilascioIstat: true,
      guestProvinciaRilascio: true,
    },
    orderBy: { dataArrivo: 'asc' },
  })

  // Filtra solo gli ospiti con dati validi
  const validi = prenotazioni.filter(p => validateGuest(p as AlloggiatiGuest).valid)

  if (validi.length === 0) {
    return NextResponse.json(
      { error: 'Nessun ospite con dati completi per il periodo selezionato' },
      { status: 400 },
    )
  }

  const txt = generateAlloggiatiFile(
    struttura.alloggiatiCodiceStruttura,
    validi as AlloggiatiGuest[],
  )

  const filename = `alloggiati_${struttura.alloggiatiCodiceStruttura}_${da}_${a}.txt`

  return new NextResponse(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
