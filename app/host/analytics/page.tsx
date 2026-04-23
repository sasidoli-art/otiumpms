import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { isHostAuthorized } from '@/lib/permissions'
import AnalyticsDashboard from '@/components/analytics/analytics-dashboard'

export const metadata = { title: 'Analytics — Otium' }

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  return <AnalyticsDashboard />
}
