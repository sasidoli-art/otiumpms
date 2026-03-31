import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import IntegrazioneBoard from './integrazione-board'

export const metadata = { title: 'Integrazione sito — Host' }

export default async function IntegrazionePage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <IntegrazioneBoard />
}
