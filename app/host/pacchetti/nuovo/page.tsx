import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PacchettoForm from './pacchetto-form'

export default async function NuovoPacchettoPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

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
          <h1 className="text-2xl font-bold text-gray-900">Nuovo pacchetto</h1>
          <p className="text-sm text-gray-500">Crea un'offerta evento + soggiorno</p>
        </div>
      </div>

      <PacchettoForm strutture={strutture} eventi={eventi} />
    </div>
  )
}
