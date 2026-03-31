import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import ManutenzioneBoard from './manutenzione-board'

export default async function ManutenzionePage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const [strutture, segnalazioni] = await Promise.all([
    prisma.struttura.findMany({
      where: { hostId: hostId },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.segnalazioneManutenzione.findMany({
      where: { hostId: hostId },
      include: {
        struttura: { select: { id: true, nome: true } },
        unita: { select: { id: true, nome: true } },
      },
      orderBy: [{ priorita: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return (
    <ManutenzioneBoard
      strutture={strutture}
      segnalazioniIniziali={segnalazioni.map(s => ({
        ...s,
        dataScadenza: s.dataScadenza?.toISOString() ?? null,
        dataRisoluzione: s.dataRisoluzione?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
    />
  )
}
