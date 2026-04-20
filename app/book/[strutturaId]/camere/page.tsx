import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import BookingLayout from '@/components/book/booking-layout'
import CamereFlow from '@/components/book/camere/camere-flow'
import { getStrutturaPubblica } from '@/lib/book/get-struttura-pubblica'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise
  const s = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: { nome: true },
  })
  if (!s) return { title: 'Non trovato' }
  return { title: `Prenota una camera — ${s.nome}` }
}

export default async function BookingCamerePage({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise
  const struttura = await getStrutturaPubblica(params.strutturaId)
  if (!struttura || !struttura.moduli.prenotazioni) notFound()

  // Capacità massima tra le unità (per cap stepper ospiti) + policy cancellazione
  const [maxCap, cfg] = await Promise.all([
    prisma.unitaPrenotabile.aggregate({
      where: { strutturaId: params.strutturaId, attiva: true },
      _max: { capacita: true, lettiExtra: true },
    }),
    prisma.struttura.findUnique({
      where: { id: params.strutturaId },
      select: { cancellazionePolicy: true },
    }),
  ])
  const capacitaMax = (maxCap._max.capacita ?? 4) + (maxCap._max.lettiExtra ?? 0)

  return (
    <BookingLayout struttura={struttura}>
      <div className="max-w-4xl mx-auto">
        <CamereFlow
          strutturaId={struttura.id}
          strutturaNome={struttura.nome}
          strutturaIndirizzo={
            struttura.indirizzo
              ? `${struttura.indirizzo}${struttura.citta ? `, ${struttura.citta}` : ''}`
              : null
          }
          strutturaTelefono={struttura.telefonoHost}
          moduloSpaAttivo={struttura.moduli.spa}
          cancellazionePolicy={cfg?.cancellazionePolicy ?? null}
          capacitaMax={capacitaMax}
        />
      </div>
    </BookingLayout>
  )
}
