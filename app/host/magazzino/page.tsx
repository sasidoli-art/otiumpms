import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import MagazzinoBoard from './magazzino-board'

export const metadata = { title: 'Magazzino — Host' }

export default async function MagazzinoPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <MagazzinoBoard />
}
