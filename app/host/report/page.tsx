import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import ReportClient from './report-client'
import { isHostAuthorized } from '@/lib/permissions'

export default async function ReportPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const oggi = new Date()

  return <ReportClient annoIniziale={oggi.getFullYear()} meseIniziale={oggi.getMonth() + 1} />
}
