import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import OggettiSmarritiBoard from './oggetti-smarriti-board'

export const metadata = { title: 'Oggetti Smarriti — Host' }

export default async function OggettiSmarritiPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <OggettiSmarritiBoard />
}
