import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import CabinaDisplay from './cabina-display'

export default async function CabinaDisplayPage({ params: paramsPromise }: { params: Promise<{ cabinaId: string }> }) {
  const { cabinaId } = await paramsPromise

  const cabina = await prisma.cabinaSpa.findUnique({
    where: { id: cabinaId },
    select: { id: true, nome: true, colore: true, fotoSfondo: true },
  })

  if (!cabina) notFound()

  return <CabinaDisplay cabinaId={cabina.id} cabinaNome={cabina.nome} colore={cabina.colore} fotoSfondo={cabina.fotoSfondo} />
}
