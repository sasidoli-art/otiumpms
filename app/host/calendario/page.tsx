import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { isHostAuthorized } from '@/lib/permissions'
import { getStrutturaAttivaId } from '@/lib/struttura-attiva'
import PlanningView from '@/components/calendario/planning-view'

export const metadata = { title: 'Calendario planning' }
export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const strutturaId = await getStrutturaAttivaId(hostId)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendario planning</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vista occupazione camere per i prossimi giorni. Click su una barra per il dettaglio,
          click su cella libera per creare una nuova prenotazione.
        </p>
      </div>
      <PlanningView strutturaId={strutturaId} />
    </div>
  )
}
