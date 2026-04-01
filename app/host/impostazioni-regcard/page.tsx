import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { RegCardSettingsForm } from './regcard-settings-form'

export default async function RegCardSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')

  const host = session.user.role === 'HOST'
    ? await prisma.host.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          regCardTerminiHtml: true,
          regCardPrivacyHtml: true,
          regCardSpaTerminiHtml: true,
          regCardCampiExtra: true,
        },
      })
    : await prisma.host.findFirst({
        select: {
          id: true,
          regCardTerminiHtml: true,
          regCardPrivacyHtml: true,
          regCardSpaTerminiHtml: true,
          regCardCampiExtra: true,
        },
      })

  if (!host) redirect('/login')

  return (
    <RegCardSettingsForm
      terminiHtml={host.regCardTerminiHtml ?? ''}
      privacyHtml={host.regCardPrivacyHtml ?? ''}
      spaTerminiHtml={host.regCardSpaTerminiHtml ?? ''}
      campiExtra={(host.regCardCampiExtra as any[]) ?? []}
    />
  )
}
