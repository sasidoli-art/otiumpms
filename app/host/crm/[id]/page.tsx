import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import OspiteDetail from './ospite-detail'

export default async function OspiteDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  const params = await paramsPromise

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: params.id, hostId: hostId },
  })
  if (!ospite) notFound()

  // Prenotazioni via email
  const prenotazioni = await prisma.prenotazione.findMany({
    where: { hostId: hostId, guestEmail: ospite.email },
    include: {
      unita: { select: { nome: true } },
      struttura: { select: { nome: true } },
    },
    orderBy: { dataArrivo: 'desc' },
    take: 20,
  })

  const serialized = {
    ospite: {
      ...ospite,
      dataUltimoSoggiorno: ospite.dataUltimoSoggiorno?.toISOString() ?? null,
      createdAt: ospite.createdAt.toISOString(),
      updatedAt: ospite.updatedAt.toISOString(),
    },
    prenotazioni: prenotazioni.map(p => ({
      id: p.id,
      guestNome: p.guestNome,
      guestCognome: p.guestCognome,
      guestEmail: p.guestEmail,
      dataArrivo: p.dataArrivo.toISOString(),
      dataPartenza: p.dataPartenza?.toISOString() ?? null,
      stato: p.stato,
      numOspiti: p.numOspiti,
      prezzoTotale: p.prezzoTotale,
      unitaNome: p.unita?.nome ?? null,
      strutturaNome: p.struttura?.nome ?? null,
    })),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/host/crm" className="flex items-center gap-1 hover:text-brand-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> CRM Ospiti
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{ospite.cognome} {ospite.nome}</span>
      </div>
      <OspiteDetail {...serialized} />
    </div>
  )
}
