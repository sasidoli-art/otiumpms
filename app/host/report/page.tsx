import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import ReportClient from './report-client'

export default async function ReportPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const oggi = new Date()

  return <ReportClient annoIniziale={oggi.getFullYear()} meseIniziale={oggi.getMonth() + 1} />
}
