import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import PromemoriaBoard from './promemoria-board'

export const metadata = { title: 'Promemoria — Host' }

export default async function PromemoriaPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  return <PromemoriaBoard />
}
