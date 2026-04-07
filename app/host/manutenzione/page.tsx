import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import ManutenzioneBoard from './manutenzione-board'
import { isHostAuthorized } from '@/lib/permissions'
import { getStrutturaAttivaId } from '@/lib/struttura-attiva'

export default async function ManutenzionePage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  const strutturaId = await getStrutturaAttivaId(hostId)

  const [strutture, segnalazioni] = await Promise.all([
    prisma.struttura.findMany({
      where: { hostId: hostId, ...(strutturaId && { id: strutturaId }) },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.segnalazioneManutenzione.findMany({
      where: { hostId: hostId, ...(strutturaId && { strutturaId }) },
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
