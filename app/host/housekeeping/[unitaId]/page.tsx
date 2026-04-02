import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import StanzaDetail from './stanza-detail'
import { isHostAuthorized } from '@/lib/permissions'

export default async function HousekeepingStanzaPage({
  params: paramsPromise,
}: {
  params: Promise<{ unitaId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const params = await paramsPromise

  const unita = await prisma.unitaPrenotabile.findFirst({
    where: {
      id: params.unitaId,
      struttura: { hostId: hostId },
    },
    include: {
      struttura: { select: { id: true, nome: true } },
      taskHK: {
        orderBy: [{ completato: 'asc' }, { priorita: 'desc' }, { createdAt: 'asc' }],
      },
      prenotazioni: {
        where: {
          stato: { in: ['RICHIESTA', 'CONFERMATA', 'COMPLETATA'] },
          dataArrivo: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) },
        },
        orderBy: { dataArrivo: 'asc' },
        take: 10,
        select: {
          id: true,
          guestNome: true,
          guestCognome: true,
          guestEmail: true,
          dataArrivo: true,
          dataPartenza: true,
          stato: true,
          numOspiti: true,
        },
      },
    },
  })

  if (!unita) notFound()

  // Serializza Date → string per il client component
  const serialized = {
    ...unita,
    ultimaPulizia: unita.ultimaPulizia?.toISOString() ?? null,
    taskHK: unita.taskHK.map(t => ({
      ...t,
      completatoAt: t.completatoAt?.toISOString() ?? null,
      dataScadenza: t.dataScadenza?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    prenotazioni: unita.prenotazioni.map(p => ({
      ...p,
      dataArrivo: p.dataArrivo.toISOString(),
      dataPartenza: p.dataPartenza?.toISOString() ?? null,
    })),
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/host/housekeeping" className="flex items-center gap-1 hover:text-brand-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Housekeeping
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{unita.nome}</span>
        <span className="text-gray-400">— {unita.struttura.nome}</span>
      </div>

      <StanzaDetail unita={serialized} />
    </div>
  )
}
