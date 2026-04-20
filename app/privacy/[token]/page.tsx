import { notFound } from 'next/navigation'
import { verificaPortaleToken, getConsensiOspite } from '@/lib/consent'
import { prisma } from '@/lib/db'
import PrivacyPortal from '@/components/privacy/privacy-portal'

export const dynamic = 'force-dynamic'

export default async function PrivacyPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const subject = verificaPortaleToken(token)
  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link non valido</h1>
          <p className="text-sm text-gray-500">
            Il link di accesso al portale privacy non è valido o è stato modificato.
            Contatta la struttura per ricevere un nuovo link.
          </p>
        </div>
      </div>
    )
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
      },
    }),
    prisma.appuntamentoSpa.findMany({
      where: { hostId, guestEmail: email },
      orderBy: { dataOra: 'desc' },
      select: {
        id: true,
        dataOra: true,
        stato: true,
        waiver: { select: { id: true, confermato: true } },
      },
    }),
    getConsensiOspite(email, hostId),
  ])

  if (!host) notFound()

  const waiverAttivi = appuntamentiSpa.filter((a) => a.waiver?.confermato).length

  const fallbackAnagrafica = prenotazioni[0]
    ? {
        nome: prenotazioni[0].guestNome,
        cognome: prenotazioni[0].guestCognome,
        telefono: prenotazioni[0].guestTelefono,
      }
    : null

  return (
    <PrivacyPortal
      token={token}
      host={{ nomeAzienda: host.nomeAzienda, logo: host.logo, regione: host.regione }}
      ospite={{
        email,
        nome: ospiteCRM?.nome ?? fallbackAnagrafica?.nome ?? null,
        cognome: ospiteCRM?.cognome ?? fallbackAnagrafica?.cognome ?? null,
        telefono: ospiteCRM?.telefono ?? fallbackAnagrafica?.telefono ?? null,
        nazionalita: ospiteCRM?.nazionalita ?? null,
      }}
      prenotazioni={prenotazioni.map((p) => ({
        id: p.id,
        struttura: p.struttura?.nome ?? null,
        dataArrivo: p.dataArrivo.toISOString(),
        dataPartenza: p.dataPartenza?.toISOString() ?? null,
        numOspiti: p.numOspiti,
        stato: p.stato,
      }))}
      crm={
        ospiteCRM
          ? {
              preferenze: ospiteCRM.preferenze,
              tags: ospiteCRM.tags,
              vip: ospiteCRM.vip,
              numSoggiorni: ospiteCRM.numSoggiorni,
              totaleSpeso: ospiteCRM.totaleSpeso,
              dataUltimoSoggiorno: ospiteCRM.dataUltimoSoggiorno?.toISOString() ?? null,
            }
          : null
      }
      spa={{
        appuntamenti: appuntamentiSpa.length,
        waiverAttivi,
      }}
      consensi={consensi.map((c) => ({
        ...c,
        dataUltimoCambio: c.dataUltimoCambio?.toISOString() ?? null,
      }))}
    />
  )
}
