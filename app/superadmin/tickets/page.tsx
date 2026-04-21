import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import TicketsBoard from '@/components/superadmin/tickets-board'

export default async function SuperadminTicketsPage() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Ticket Management</h1>
        <p className="text-sm text-gray-500">Gestione segnalazioni piattaforma</p>
      </div>
      <TicketsBoard />
    </div>
  )
}
