import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ProfiloForm } from './profilo-form'
import { getTranslations } from 'next-intl/server'

export default async function HostProfiloPage() {
  const session = await getServerSession(authOptions)
  const hostId = await getHostId()
  if (!session || !hostId) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    include: { user: true },
  })

  if (!host) redirect('/login')

  const t = await getTranslations('host.profile')

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <ProfiloForm
        host={host}
        user={{ nome: host.user.nome, cognome: host.user.cognome, email: host.user.email }}
      />
    </div>
  )
}
