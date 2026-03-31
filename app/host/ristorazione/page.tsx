import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import RistorazioneBoard from './ristorazione-board'

export const metadata = { title: 'Ristorazione — Host' }

export default async function RistorazionePage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <RistorazioneBoard />
}
