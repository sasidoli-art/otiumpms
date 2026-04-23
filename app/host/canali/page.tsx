import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import CanaliManagement from '@/components/canali/canali-management'

export const metadata = { title: 'Canali di distribuzione — Host' }

export default async function CanaliPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <CanaliManagement />
}
