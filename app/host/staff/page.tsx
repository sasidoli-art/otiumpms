import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import StaffBoard from './staff-board'
import { isHostAuthorized } from '@/lib/permissions'

export default async function StaffPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const comunicazioni = await prisma.comunicazioneStaff.findMany({
    where: { hostId: hostId, archiviato: false },
    orderBy: [{ fissato: 'desc' }, { createdAt: 'desc' }],
  })

  const archiviate = await prisma.comunicazioneStaff.count({
    where: { hostId: hostId, archiviato: true },
  })

  return (
    <StaffBoard
      comunicazioniIniziali={comunicazioni.map(c => ({
        ...c,
        dataScadenza: c.dataScadenza?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))}
      totaleArchiviate={archiviate}
    />
  )
}
