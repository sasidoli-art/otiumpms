import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, LayoutGrid } from 'lucide-react'
import PannelloStanze from './pannello-stanze'

export default async function PannelloPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: hostId },
  })
  if (!struttura) notFound()

  const meseCorrente = format(new Date(), 'yyyy-MM')
  const [anno, meseNum] = meseCorrente.split('-').map(Number)
  const inizio = new Date(anno, meseNum - 1, 1)
  const fine = new Date(anno, meseNum, 0)

  const unita = await prisma.unitaPrenotabile.findMany({
    where: { strutturaId: params.id, attiva: true },
    include: {
      tariffe: {
        where: { dataInizio: { lte: fine }, dataFine: { gte: inizio } },
        orderBy: { dataInizio: 'asc' },
      },
      disponibilita: {
        where: { data: { gte: inizio, lte: fine } },
        orderBy: { data: 'asc' },
      },
      prenotazioni: {
        where: {
          stato: { notIn: ['ANNULLATA', 'NO_SHOW'] },
          dataArrivo: { lte: fine },
          OR: [{ dataPartenza: { gte: inizio } }, { dataPartenza: null }],
        },
        select: { dataArrivo: true, dataPartenza: true, stato: true, guestNome: true, guestCognome: true },
      },
    },
    orderBy: { nome: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/host/strutture/${params.id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Pannello Stanze</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{struttura.nome}</p>
        </div>
      </div>

      <PannelloStanze strutturaId={params.id} unitaIniziali={JSON.parse(JSON.stringify(unita))} />
    </div>
  )
}
