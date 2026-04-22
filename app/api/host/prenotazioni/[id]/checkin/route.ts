import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const params = await paramsPromise
  const body = await req.json()

  // Verifica che la prenotazione appartenga all'host
  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!prenotazione) {
    return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  }

  if (!['RICHIESTA', 'CONFERMATA'].includes(prenotazione.stato)) {
    return NextResponse.json(
      { error: `Impossibile fare check-in con stato ${prenotazione.stato}` },
      { status: 400 }
    )
  }

  // Salva dati documento + cambia stato
  const aggiornata = await prisma.prenotazione.update({
    where: { id: params.id },
    data: {
      stato: 'CONFERMATA',
      // dati documento ospite
      guestSesso: body.guestSesso ?? prenotazione.guestSesso,
      guestDataNascita: body.guestDataNascita
        ? new Date(body.guestDataNascita)
        : prenotazione.guestDataNascita,
      guestLuogoNascita: body.guestLuogoNascita ?? prenotazione.guestLuogoNascita,
      guestComuneNascitaIstat: body.guestComuneNascitaIstat ?? prenotazione.guestComuneNascitaIstat,
      guestProvinciaNascita: body.guestProvinciaNascita ?? prenotazione.guestProvinciaNascita,
      guestStatoNascitaIstat: body.guestStatoNascitaIstat ?? prenotazione.guestStatoNascitaIstat,
      guestCittadinanzaIstat: body.guestCittadinanzaIstat ?? prenotazione.guestCittadinanzaIstat,
      guestTipoDocumento: body.guestTipoDocumento ?? prenotazione.guestTipoDocumento,
      guestNumeroDocumento: body.guestNumeroDocumento ?? prenotazione.guestNumeroDocumento,
      guestLuogoRilascio: body.guestLuogoRilascio ?? prenotazione.guestLuogoRilascio,
      guestComuneRilascioIstat: body.guestComuneRilascioIstat ?? prenotazione.guestComuneRilascioIstat,
      guestProvinciaRilascio: body.guestProvinciaRilascio ?? prenotazione.guestProvinciaRilascio,
      guestStatoRilascioIstat: body.guestStatoRilascioIstat ?? prenotazione.guestStatoRilascioIstat,
      guestCodiceFiscale: body.guestCodiceFiscale ?? (prenotazione as Record<string, unknown>).guestCodiceFiscale ?? null,
    },
  })

  // Notifica in-app check-in
  await prisma.notifica.create({
    data: {
      hostId: auth.user.hostId,
      tipo: 'checkin',
      titolo: 'Check-in completato',
      messaggio: `${prenotazione.guestNome} ${prenotazione.guestCognome} — check-in registrato`,
      linkUrl: `/host/prenotazioni/${params.id}`,
    },
  })

  // GDPR Art. 30 — traccia registrazione dati documento ospite (Alloggiati PS)
  await auditFromAuth(session, {
    azione: 'prenotazione.checkin',
    entita: 'prenotazione',
    entitaId: params.id,
    dettagli: `Check-in ${prenotazione.guestCognome} ${prenotazione.guestNome} · doc=${aggiornata.guestTipoDocumento ?? '-'} n.${aggiornata.guestNumeroDocumento ? '***' + String(aggiornata.guestNumeroDocumento).slice(-3) : '-'}`,
  })

  return NextResponse.json(aggiornata)
}
