import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { CabinaKiosk } from './cabina-kiosk'

export default async function CabinaKioskPage({
  params: paramsPromise,
}: {
  params: Promise<{ cabinaId: string }>
}) {
  const { cabinaId } = await paramsPromise

  const cabina = await prisma.cabinaSpa.findUnique({
    where: { id: cabinaId },
    select: {
      id: true,
      nome: true,
      host: { select: { nomeAzienda: true } },
    },
  })

  if (!cabina) notFound()

  return (
    <CabinaKiosk
      cabinaId={cabina.id}
      cabinaNome={cabina.nome}
      hostNome={cabina.host?.nomeAzienda ?? 'SPA'}
    />
  )
}
