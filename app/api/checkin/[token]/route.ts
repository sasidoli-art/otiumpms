import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// ─── GET: load booking info by token (public) ─────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ token: string }> }
) {
  const { token } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { checkInToken: token },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      guestTelefono: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      stato: true,
      prezzoTotale: true,
      checkInCompletato: true,
      guestSesso: true,
      guestDataNascita: true,
      guestLuogoNascita: true,
      guestProvinciaNascita: true,
      guestStatoNascitaIstat: true,
      guestCittadinanzaIstat: true,
      guestTipoDocumento: true,
      guestNumeroDocumento: true,
      guestLuogoRilascio: true,
      guestProvinciaRilascio: true,
      struttura: { select: { nome: true, indirizzo: true, citta: true } },
      unita: { select: { nome: true } },
      host: { select: { nomeAzienda: true, telefono: true } },
    },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Link non valido o scaduto' }, { status: 404 })
  }
  if (prenotazione.stato === 'ANNULLATA') {
    return NextResponse.json({ error: 'Prenotazione annullata' }, { status: 410 })
  }

  return NextResponse.json(prenotazione)
}

// ─── POST: submit guest anagrafica (public) ───────────────────────────────────
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ token: string }> }
) {
  const { token } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { checkInToken: token },
    select: { id: true, hostId: true, stato: true, checkInCompletato: true },
  })

  if (!prenotazione) return NextResponse.json({ error: 'Link non valido' }, { status: 404 })
  if (prenotazione.stato === 'ANNULLATA') return NextResponse.json({ error: 'Annullata' }, { status: 410 })
  if (prenotazione.checkInCompletato) return NextResponse.json({ error: 'Check-in già completato' }, { status: 409 })

  const body = await req.json()
  const {
    guestSesso, guestDataNascita, guestLuogoNascita, guestComuneNascitaIstat,
    guestProvinciaNascita, guestStatoNascitaIstat, guestCittadinanzaIstat,
    guestTipoDocumento, guestNumeroDocumento, guestLuogoRilascio,
    guestComuneRilascioIstat, guestProvinciaRilascio, guestStatoRilascioIstat,
    guestTelefono,
    accompagnatori,  // array opzionale di accompagnatori
  } = body

  if (!guestTipoDocumento || !guestNumeroDocumento) {
    return NextResponse.json({ error: 'Tipo e numero documento obbligatori' }, { status: 400 })
  }

  const updated = await prisma.prenotazione.update({
    where: { id: prenotazione.id },
    data: {
      guestSesso: guestSesso || null,
      guestDataNascita: guestDataNascita ? new Date(guestDataNascita) : null,
      guestLuogoNascita: guestLuogoNascita || null,
      guestComuneNascitaIstat: guestComuneNascitaIstat || null,
      guestProvinciaNascita: guestProvinciaNascita || null,
      guestStatoNascitaIstat: guestStatoNascitaIstat || '100000100',
      guestCittadinanzaIstat: guestCittadinanzaIstat || '100000100',
      guestTipoDocumento,
      guestNumeroDocumento,
      guestLuogoRilascio: guestLuogoRilascio || null,
      guestComuneRilascioIstat: guestComuneRilascioIstat || null,
      guestProvinciaRilascio: guestProvinciaRilascio || null,
      guestStatoRilascioIstat: guestStatoRilascioIstat || '100000100',
      guestTelefono: guestTelefono || undefined,
      checkInCompletato: true,
    },
    select: { id: true, checkInCompletato: true },
  })

  // Salva accompagnatori (se presenti)
  if (Array.isArray(accompagnatori) && accompagnatori.length > 0) {
    // Rimuovi accompagnatori esistenti (l'ospite potrebbe rifare il check-in)
    await prisma.accompagnatore.deleteMany({ where: { prenotazioneId: prenotazione.id } })

    for (const acc of accompagnatori) {
      if (!acc.nome || !acc.cognome) continue
      await prisma.accompagnatore.create({
        data: {
          prenotazioneId: prenotazione.id,
          nome: acc.nome,
          cognome: acc.cognome,
          sesso: acc.sesso || null,
          dataNascita: acc.dataNascita ? new Date(acc.dataNascita) : null,
          luogoNascita: acc.luogoNascita || null,
          provinciaNascita: acc.provinciaNascita || null,
          nazionalita: acc.nazionalita || null,
          tipoDocumento: acc.tipoDocumento || null,
          numeroDocumento: acc.numeroDocumento || null,
          luogoRilascio: acc.luogoRilascio || null,
          provinciaRilascio: acc.provinciaRilascio || null,
          email: acc.email || null,
          telefono: acc.telefono || null,
          isMinore: acc.isMinore === true,
        },
      })
    }
  }

  // Crea notifica per l'host
  const numAcc = Array.isArray(accompagnatori) ? accompagnatori.filter((a: { nome?: string }) => a.nome).length : 0
  await prisma.notifica.create({
    data: {
      hostId: prenotazione.hostId,
      tipo: 'checkin',
      titolo: 'Check-in online completato',
      messaggio: `Un ospite ha completato il check-in online${numAcc > 0 ? ` con ${numAcc} accompagnator${numAcc === 1 ? 'e' : 'i'}` : ''}`,
      linkUrl: `/host/prenotazioni/${prenotazione.id}`,
    },
  })

  return NextResponse.json(updated)
}
