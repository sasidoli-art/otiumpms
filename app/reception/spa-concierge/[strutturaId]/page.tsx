import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import SpaConciergeDesk from './spa-concierge-desk'

export default async function SpaConciergePageWrapper({ params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const { strutturaId } = await paramsPromise

  const struttura = await prisma.struttura.findUnique({
    where: { id: strutturaId },
    select: { id: true, nome: true, logo: true, colorePrimario: true },
  })
  if (!struttura) notFound()

  return <SpaConciergeDesk strutturaId={struttura.id} strutturaNome={struttura.nome} logo={struttura.logo} colore={struttura.colorePrimario ?? '#8b5cf6'} />
}
