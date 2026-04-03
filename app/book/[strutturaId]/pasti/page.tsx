import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import SceltaPastiForm from './scelta-pasti-form'



export const metadata = { title: 'Scelta pasti — Otium' }

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

  // Carica la struttura
  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: {
      id: true,
      nome: true,
      citta: true,
      host: { select: { nomeAzienda: true } },
    },
  })
  if (!struttura) notFound()

  // Carica la prenotazione con piano pasto
  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, strutturaId: params.strutturaId },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      pianoPasto: {
        select: {
          piano: true,
          pastiExtra: true,
          pastiEsclusi: true,
        },
      },
    },
  })
  if (!prenotazione) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            {struttura.host.nomeAzienda}
          </p>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Scegli i tuoi pasti {/* TODO: i18n */}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {struttura.nome} · {struttura.citta}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <SceltaPastiForm
          strutturaId={struttura.id}
          prenotazioneId={prenotazione.id}
          guestNome={`${prenotazione.guestNome} ${prenotazione.guestCognome}`}
          dataArrivo={prenotazione.dataArrivo.toISOString()}
          dataPartenza={prenotazione.dataPartenza?.toISOString() ?? prenotazione.dataArrivo.toISOString()}
          numOspiti={prenotazione.numOspiti}
          pianoPasto={prenotazione.pianoPasto?.piano ?? 'PERNOTTAMENTO_COLAZIONE'}
          pastiExtra={prenotazione.pianoPasto?.pastiExtra ?? []}
          pastiEsclusi={prenotazione.pianoPasto?.pastiEsclusi ?? []}
        />
      </div>
    </div>
  )
}
