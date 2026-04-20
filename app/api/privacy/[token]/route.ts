import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verificaPortaleToken, getConsensiOspite } from '@/lib/consent'

/**
 * GET /api/privacy/[token] — pubblico, autenticato via portale token HMAC.
 *
 * Ritorna tutti i dati che la struttura ha sull'ospite, per il portale
 * self-service di gestione privacy.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const subject = verificaPortaleToken(token)
  if (!subject) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
  }
  const { email, hostId } = subject

  const [host, prenotazioni, ospiteCRM, appuntamentiSpa, consensi] = await Promise.all([
    prisma.host.findUnique({
      where: { id: hostId },
      select: { nomeAzienda: true, logo: true, regione: true },
    }),
    prisma.prenotazione.findMany({
      where: { hostId, guestEmail: email, deletedAt: null },
      orderBy: { dataArrivo: 'desc' },
      select: {
        id: true,
        guestNome: true,
        guestCognome: true,
        guestTelefono: true,
        dataArrivo: true,
        dataPartenza: true,
        numOspiti: true,
        stato: true,
        prezzoTotale: true,
        struttura: { select: { nome: true } },
      },
    }),
    prisma.ospiteCRM.findUnique({
      where: { hostId_email: { hostId, email } },
      select: {
        nome: true,
        cognome: true,
        telefono: true,
        nazionalita: true,
        preferenze: true,
        tags: true,
        vip: true,
        numSoggiorni: true,
        totaleSpeso: true,
        dataUltimoSoggiorno: true,
        spaAllergie: true,
        spaNote: true,
      },
    }),
    prisma.appuntamentoSpa.findMany({
      where: { hostId, guestEmail: email },
      orderBy: { dataOra: 'desc' },
      select: {
        id: true,
        dataOra: true,
        stato: true,
        trattamento: { select: { nome: true } },
        percorso: { select: { nome: true } },
        waiver: { select: { id: true, confermato: true } },
      },
    }),
    getConsensiOspite(email, hostId),
  ])

  if (!host) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const waiverCount = appuntamentiSpa.filter((a) => a.waiver?.confermato).length

  return NextResponse.json({
    host: {
      nomeAzienda: host.nomeAzienda,
      logo: host.logo,
      regione: host.regione,
    },
    ospite: {
      email,
      nome: ospiteCRM?.nome ?? prenotazioni[0]?.guestNome ?? null,
      cognome: ospiteCRM?.cognome ?? prenotazioni[0]?.guestCognome ?? null,
      telefono: ospiteCRM?.telefono ?? prenotazioni[0]?.guestTelefono ?? null,
      nazionalita: ospiteCRM?.nazionalita ?? null,
    },
    prenotazioni: prenotazioni.map((p) => ({
      id: p.id,
      struttura: p.struttura?.nome ?? null,
      dataArrivo: p.dataArrivo,
      dataPartenza: p.dataPartenza,
      numOspiti: p.numOspiti,
      stato: p.stato,
      prezzoTotale: p.prezzoTotale,
    })),
    crm: ospiteCRM
      ? {
          preferenze: ospiteCRM.preferenze,
          tags: ospiteCRM.tags,
          vip: ospiteCRM.vip,
          numSoggiorni: ospiteCRM.numSoggiorni,
          totaleSpeso: ospiteCRM.totaleSpeso,
          dataUltimoSoggiorno: ospiteCRM.dataUltimoSoggiorno,
          spaAllergie: ospiteCRM.spaAllergie,
          spaNote: ospiteCRM.spaNote,
        }
      : null,
    spa: {
      appuntamenti: appuntamentiSpa.length,
      waiverAttivi: waiverCount,
    },
    consensi,
  })
}
