import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import CanaliBoard from './canali-board'

export const metadata = { title: 'Channel Manager — Host' }

export default async function CanaliPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <CanaliBoard />
}
