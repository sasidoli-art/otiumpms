import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TicketDetail from './ticket-detail'

export default async function TicketDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  const { id } = await paramsPromise
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nome: true, cognome: true, email: true, role: true } },
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
    },
  })
  if (!ticket) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/superadmin/tickets" className="flex items-center gap-1 hover:text-brand-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Ticket
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate">{ticket.oggetto}</span>
      </div>

      <TicketDetail
        ticket={{
          ...ticket,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          rispostoAt: ticket.rispostoAt?.toISOString() ?? null,
        }}
      />
    </div>
  )
}
