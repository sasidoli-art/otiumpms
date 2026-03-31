import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import HousekeepingBoard from './housekeeping-board'

export default async function HousekeepingPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const strutture = await prisma.struttura.findMany({
    where: { hostId: hostId },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  const unita = await prisma.unitaPrenotabile.findMany({
    where: { struttura: { hostId: hostId } },
    include: {
      struttura: { select: { id: true, nome: true } },
      taskHK: {
        where: { completato: false },
        orderBy: [{ priorita: 'desc' }, { createdAt: 'asc' }],
      },
      prenotazioni: {
        where: {
          stato: { in: ['CONFERMATA'] },
          OR: [
            // in casa oggi
            {
              dataArrivo: { lte: new Date() },
              dataPartenza: { gte: new Date() },
            },
            // arrivo oggi
            {
              dataArrivo: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lte: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
          ],
        },
        orderBy: { dataArrivo: 'asc' },
        take: 1,
        select: {
          id: true,
          guestNome: true,
          guestCognome: true,
          dataArrivo: true,
          dataPartenza: true,
          stato: true,
        },
      },
    },
    orderBy: [{ strutturaId: 'asc' }, { nome: 'asc' }],
  })

  return (
    <HousekeepingBoard
      strutture={strutture}
      unitaIniziali={unita.map(u => ({
        ...u,
        ultimaPulizia: u.ultimaPulizia?.toISOString() ?? null,
        taskHK: u.taskHK.map(t => ({
          ...t,
          completatoAt: t.completatoAt?.toISOString() ?? null,
          dataScadenza: t.dataScadenza?.toISOString() ?? null,
        })),
        prenotazioni: u.prenotazioni.map(p => ({
          ...p,
          dataArrivo: p.dataArrivo.toISOString(),
          dataPartenza: p.dataPartenza?.toISOString() ?? null,
        })),
      }))}
    />
  )
}
