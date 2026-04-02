import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { CheckinSettingsForm } from './checkin-settings-form'
import { isHostAuthorized } from '@/lib/permissions'

export default async function ImpostazioniCheckinPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')

  const host = session.user.role === 'HOST'
    ? await prisma.host.findUnique({
        where: { userId: session.user.id },
        select: { id: true, modalitaCheckin: true },
      })
    : await prisma.host.findFirst({
        select: { id: true, modalitaCheckin: true },
      })

  if (!host) redirect('/login')

  return <CheckinSettingsForm modalitaCheckin={host.modalitaCheckin ?? 'completo'} />
}
