import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { isHostAuthorized } from '@/lib/permissions'
import ReportRevenue from '@/components/report/report-revenue'

export const metadata = { title: 'Report — Otium' }

export default async function ReportPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Report</h1>
        <p className="text-sm text-gray-500">
          Report dettagliati per commercialista e gestione interna. Export CSV e PDF.
        </p>
      </div>
      <ReportRevenue />
    </div>
  )
}
