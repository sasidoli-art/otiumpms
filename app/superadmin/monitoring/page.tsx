import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import Monitoring from '@/components/superadmin/monitoring'

export const metadata = { title: 'Monitoring — SuperAdmin' }

export default async function MonitoringPage() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Monitoring</h1>
        <p className="text-sm text-gray-500">Stato sistema, health check servizi, errori recenti.</p>
      </div>
      <Monitoring />
    </div>
  )
}
