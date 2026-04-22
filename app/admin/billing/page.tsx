import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import BillingDashboard from '@/components/admin/billing-dashboard'

export default async function AdminBillingPage() {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="text-sm text-gray-500">
            MRR, abbonamenti, pagamenti platform. Stripe integration predisposta (placeholder).
          </p>
        </div>
      </div>
      <BillingDashboard />
    </div>
  )
}
