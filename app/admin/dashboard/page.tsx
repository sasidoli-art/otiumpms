import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/admin/admin-dashboard'

export default async function AdminDashboardPage() {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Panoramica platform — host clienti, abbonamenti, ticket, MRR
        </p>
      </div>
      <AdminDashboard />
    </div>
  )
}
