import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DisponibilitaCalendario from './calendario'

export default async function DisponibilitaPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: hostId },
    include: {
      unita: { where: { attiva: true }, orderBy: { nome: 'asc' } },
    },
  })

  if (!struttura) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/host/strutture/${params.id}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disponibilità</h1>
          <p className="text-sm text-gray-500">{struttura.nome}</p>
        </div>
      </div>

      {struttura.unita.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="mb-2 font-medium">Nessuna unità prenotabile</p>
          <p className="text-sm">Aggiungi unità dalla pagina della struttura prima di gestire la disponibilità.</p>
          <Link href={`/host/strutture/${params.id}`} className="btn-primary mt-4 inline-block">
            Torna alla struttura
          </Link>
        </div>
      ) : (
        <DisponibilitaCalendario strutturaId={params.id} unita={struttura.unita} />
      )}
    </div>
  )
}
