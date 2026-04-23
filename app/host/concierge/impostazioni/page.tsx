import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { isHostAuthorized } from '@/lib/permissions'
import { Settings } from 'lucide-react'
import ConciergeConfig from '@/components/concierge/concierge-config'

export const metadata = { title: 'Concierge AI — Impostazioni' }

export default async function ConciergeImpostazioniPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          Concierge AI — Impostazioni
        </h1>
        <p className="text-sm text-gray-500">
          Configura il bot WhatsApp, il modello AI e il comportamento del concierge.
        </p>
      </div>
      <ConciergeConfig hostId={hostId} />
    </div>
  )
}
