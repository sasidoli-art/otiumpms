import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import GdprManager from './gdpr-manager'

export const metadata = { title: 'GDPR & Privacy — Host' }

export default async function GdprPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <GdprManager />
}
