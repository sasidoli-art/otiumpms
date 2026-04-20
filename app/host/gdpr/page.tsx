import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import GdprDashboard from '@/components/gdpr/gdpr-dashboard'

export const metadata = { title: 'GDPR & Privacy — Host' }

export default async function GdprPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <GdprDashboard />
}
