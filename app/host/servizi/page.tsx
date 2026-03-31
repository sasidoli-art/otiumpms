import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import ServiziBoard from './servizi-board'

export const metadata = { title: 'Catalogo Servizi — Host' }

export default async function ServiziPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <ServiziBoard />
}
