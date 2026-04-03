import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import FirmaDisplay from './firma-display'

export default async function ReceptionDisplayPage({ params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const { strutturaId } = await paramsPromise

  const struttura = await prisma.struttura.findUnique({
    where: { id: strutturaId },
    select: { id: true, nome: true, logo: true, colorePrimario: true, messaggioChiusura: true },
  })

  if (!struttura) notFound()

  return <FirmaDisplay strutturaId={struttura.id} strutturaNome={struttura.nome} logo={struttura.logo} colore={struttura.colorePrimario ?? '#4f46e5'} messaggio={struttura.messaggioChiusura} />
}
