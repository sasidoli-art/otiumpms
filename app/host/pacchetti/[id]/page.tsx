import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PacchettoDetail from './pacchetto-detail'
import { isHostAuthorized } from '@/lib/permissions'

export default async function PacchettoDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const pacchetto = await prisma.pacchetto.findFirst({
    where: { id: params.id, hostId: hostId },
    include: {
      struttura: { select: { id: true, nome: true, citta: true } },
      evento: { select: { id: true, titolo: true, dataInizio: true, citta: true } },
    },
  })
  if (!pacchetto) notFound()

  const [strutture, eventi] = await Promise.all([
    prisma.struttura.findMany({
      where: { hostId: hostId, attiva: true },
      select: { id: true, nome: true, citta: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.evento.findMany({
      where: { hostId: hostId, stato: { in: ['APPROVATO', 'IN_ATTESA'] } },
      select: { id: true, titolo: true, dataInizio: true, citta: true },
      orderBy: { dataInizio: 'desc' },
    }),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/host/pacchetti" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pacchetto.nome}</h1>
          <p className="text-sm text-gray-500">
            {pacchetto.struttura.nome}
            {pacchetto.struttura.citta ? ` · ${pacchetto.struttura.citta}` : ''}
          </p>
        </div>
      </div>

      <PacchettoDetail
        pacchetto={{
          ...pacchetto,
          dataInizio: pacchetto.dataInizio?.toISOString().substring(0, 10) ?? null,
          dataFine: pacchetto.dataFine?.toISOString().substring(0, 10) ?? null,
        }}
        strutture={strutture}
        eventi={eventi.map(e => ({
          ...e,
          dataInizio: e.dataInizio,
        }))}
      />
    </div>
  )
}
