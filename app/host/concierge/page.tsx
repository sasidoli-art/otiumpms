import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import ConciergeDashboard from './concierge-dashboard'

export const metadata = { title: 'AI Concierge — Host' }

export default async function ConciergePage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <ConciergeDashboard />
}
