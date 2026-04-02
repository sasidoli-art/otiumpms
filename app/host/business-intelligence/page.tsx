import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import BIDashboard from './bi-dashboard'
import { isHostAuthorized } from '@/lib/permissions'

// TODO: i18n
export default async function BusinessIntelligencePage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <BIDashboard />
}
