import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TariffeManager from './tariffe-manager'
import RegoleTariffaManager from './regole-tariffa'

export default async function TariffePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
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

  const [tariffe, regole] = await Promise.all([
    prisma.tariffaPeriodo.findMany({
      where: { unita: { strutturaId: params.id } },
      include: { unita: { select: { nome: true } } },
      orderBy: { dataInizio: 'asc' },
    }),
    prisma.regolaTariffa.findMany({
      where: { strutturaId: params.id },
      include: { unita: { select: { nome: true } } },
      orderBy: [{ priorita: 'desc' }, { createdAt: 'asc' }],
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/host/strutture/${params.id}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tariffe e prezzi</h1>
          <p className="text-sm text-gray-500">{struttura.nome}</p>
        </div>
      </div>

      <TariffeManager
        strutturaId={params.id}
        unita={struttura.unita}
        tariffe={tariffe}
      />

      <RegoleTariffaManager
        strutturaId={params.id}
        unita={struttura.unita.map(u => ({ id: u.id, nome: u.nome }))}
        regole={regole}
      />
    </div>
  )
}
