import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isHostAuthorized } from '@/lib/permissions'
import GuidaClient from './guida-client'

export const metadata = { title: 'Guida in camera — Otium' }
export const dynamic = 'force-dynamic'

export default async function GuidaPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  return <GuidaClient />
}
