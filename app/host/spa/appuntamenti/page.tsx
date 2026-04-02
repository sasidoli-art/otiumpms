import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import AppuntamentiBoard from './appuntamenti-board'
import { isHostAuthorized } from '@/lib/permissions'

export default async function SpaAppuntamentiPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <AppuntamentiBoard />
}
