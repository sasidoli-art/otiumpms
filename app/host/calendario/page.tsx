import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import CalendarioTimeline from './calendario-timeline'
import { getTranslations } from 'next-intl/server'
import { isHostAuthorized } from '@/lib/permissions'
import { getStrutturaAttivaId } from '@/lib/struttura-attiva'

export default async function CalendarioPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  const strutturaId = await getStrutturaAttivaId(hostId)

  const strutture = await prisma.struttura.findMany({
    where: { hostId: hostId, attiva: true, ...(strutturaId && { id: strutturaId }) },
    select: {
      id: true,
      nome: true,
      tipo: true,
      unita: {
        where: { attiva: true },
        select: {
          id: true,
          nome: true,
          capacita: true,
          lettiExtra: true,
          piano: true,
          statoHK: true,
          prenotazioni: {
            where: {
              stato: { notIn: ['ANNULLATA', 'NO_SHOW'] },
              dataArrivo: { lte: new Date(new Date().setMonth(new Date().getMonth() + 3)) },
              OR: [
                { dataPartenza: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
                { dataPartenza: null },
              ],
            },
            select: {
              id: true,
              guestNome: true,
              guestCognome: true,
              dataArrivo: true,
              dataPartenza: true,
              numOspiti: true,
              stato: true,
              prezzoTotale: true,
            },
            orderBy: { dataArrivo: 'asc' },
          },
          disponibilita: {
            where: { chiuso: true },
            select: { data: true },
          },
        },
        orderBy: { nome: 'asc' },
      },
    },
    orderBy: { nome: 'asc' },
  })

  const t = await getTranslations('host.calendar')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500">
          {t('subtitle')}
        </p>
      </div>
      <CalendarioTimeline strutture={strutture} />
    </div>
  )
}
