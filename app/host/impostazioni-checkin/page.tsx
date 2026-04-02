import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { CheckinSettingsForm } from './checkin-settings-form'

export default async function ImpostazioniCheckinPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')

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
