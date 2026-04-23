import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import UpsellingTabs from '@/components/upselling/upselling-tabs'

export const metadata = { title: 'Upselling — Host' }

export default async function UpsellingPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <UpsellingTabs />
}
