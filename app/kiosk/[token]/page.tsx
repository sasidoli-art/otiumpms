import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { KioskView } from './kiosk-view'
import { KioskDocs } from './kiosk-docs'

export default async function KioskPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ tipo?: string }>
}) {
  const { token } = await paramsPromise
  const { tipo = 'checkout' } = await searchParamsPromise

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { checkInToken: token },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      prezzoTotale: true,
      tassaSoggiorno: true,
      regCardFirmata: true,
      stato: true,
      struttura: { select: { nome: true, indirizzo: true, citta: true } },
      unita: { select: { nome: true } },
      host: { select: { nomeAzienda: true, regCardTerminiHtml: true, regCardPrivacyHtml: true } },
      addebiti: {
        select: { descrizione: true, quantita: true, prezzoUnitario: true, totale: true, data: true },
        orderBy: { data: 'asc' },
      },
    },
  })

  if (!prenotazione) notFound()

  const serialized = {
    ...prenotazione,
    dataArrivo: prenotazione.dataArrivo.toISOString(),
    dataPartenza: prenotazione.dataPartenza?.toISOString() ?? null,
    addebiti: prenotazione.addebiti.map(a => ({
      ...a,
      data: a.data.toISOString(),
    })),
  }

  if (tipo === 'documenti') {
    return (
      <KioskDocs
        token={token}
        prenotazione={serialized}
      />
    )
  }

  return (
    <KioskView
      token={token}
      tipo={tipo as 'checkin' | 'checkout' | 'spa_waiver'}
      prenotazione={serialized}
    />
  )
}
