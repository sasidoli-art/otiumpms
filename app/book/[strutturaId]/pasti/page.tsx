import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import MenuOspite from '@/components/pasti/menu-ospite'
import { PublicConciergeWidget } from '@/components/book/public-concierge-widget'

export const metadata = { title: 'Menu del soggiorno — Otium' }

export default async function PastiPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ strutturaId: string }>
  searchParams: Promise<{ prenotazione?: string }>
}) {
  const params = await paramsPromise
  const searchParams = await searchParamsPromise
  const prenotazioneId = searchParams.prenotazione

  if (!prenotazioneId) notFound()

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: {
      id: true,
      nome: true,
      citta: true,
      logo: true,
      colorePrimario: true,
      host: { select: { nomeAzienda: true } },
    },
  })
  if (!struttura) notFound()

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, strutturaId: params.strutturaId },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      pianoPasto: {
        select: { piano: true, pastiExtra: true, pastiEsclusi: true },
      },
    },
  })
  if (!prenotazione) notFound()

  return (
    <div className="min-h-screen bg-slate-50">
      <MenuOspite
        prenotazioneId={prenotazione.id}
        guestNome={`${prenotazione.guestNome} ${prenotazione.guestCognome}`}
        logo={struttura.logo}
        strutturaNome={struttura.nome}
        colorePrimario={struttura.colorePrimario}
        dataArrivo={prenotazione.dataArrivo.toISOString()}
        dataPartenza={prenotazione.dataPartenza?.toISOString() ?? prenotazione.dataArrivo.toISOString()}
        numOspiti={prenotazione.numOspiti}
        pianoPasto={prenotazione.pianoPasto?.piano ?? 'PERNOTTAMENTO_COLAZIONE'}
      />
      <PublicConciergeWidget strutturaId={struttura.id} strutturaNome={struttura.nome} />
    </div>
  )
}
