import { redirect } from 'next/navigation'
import { getHostId } from '@/lib/auth-middleware'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TicketDettaglio from '@/components/admin/ticket-dettaglio'

export default async function HostTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  const { id } = await params

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/host/supporto" className="flex items-center gap-1 hover:text-brand-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Supporto
        </Link>
      </div>
      <TicketDettaglio id={id} ruolo="host" />
    </div>
  )
}
