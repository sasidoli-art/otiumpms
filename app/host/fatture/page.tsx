import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import ListaFatture from '@/components/fatture/lista-fatture'
import { isHostAuthorized } from '@/lib/permissions'

export default async function HostFatturePage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  // Anni con almeno una fattura
  const annoCorrente = new Date().getFullYear()
  const annoRows = await prisma.fattura.findMany({
    where: { hostId, deletedAt: null },
    select: { anno: true },
    distinct: ['anno'],
    orderBy: { anno: 'desc' },
  })
  const anniDisponibili = annoRows.map((r) => r.anno)
  if (!anniDisponibili.includes(annoCorrente)) anniDisponibili.unshift(annoCorrente)

  return (
    <ListaFatture
      anniDisponibili={anniDisponibili}
      annoDefault={annoCorrente}
    />
  )
}
