import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import BiancheriaBoard from './biancheria-board'

export const metadata = { title: 'Biancheria — Housekeeping' }

export default async function BiancheriaPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <BiancheriaBoard />
}
