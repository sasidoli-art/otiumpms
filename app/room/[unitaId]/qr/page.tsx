import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getAppUrl } from '@/lib/app-url'
import RoomQrClient from './room-qr-client'

export const metadata = { title: 'QR Camera — Otium' }

export default async function RoomQrPage({
  params: paramsPromise,
}: {
  params: Promise<{ unitaId: string }>
}) {
  const { unitaId } = await paramsPromise

  const unita = await prisma.unitaPrenotabile.findUnique({
    where: { id: unitaId },
    select: {
      id: true,
      nome: true,
      struttura: {
        select: {
          nome: true,
          host: { select: { nomeAzienda: true, logo: true } },
        },
      },
    },
  })

  if (!unita || !unita.struttura) notFound()

  const baseUrl = getAppUrl()
  const roomUrl = `${baseUrl}/room/${unitaId}`

  return (
    <RoomQrClient
      roomUrl={roomUrl}
      unitaNome={unita.nome}
      strutturaNome={unita.struttura.nome}
      hostNome={unita.struttura.host.nomeAzienda}
      logo={unita.struttura.host.logo}
    />
  )
}
