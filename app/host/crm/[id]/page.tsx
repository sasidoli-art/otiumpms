import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DettaglioOspite from '@/components/crm/dettaglio-ospite'
import { isHostAuthorized } from '@/lib/permissions'

export default async function OspiteDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  const params = await paramsPromise

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: params.id, hostId },
    select: { id: true, cognome: true, nome: true },
  })
  if (!ospite) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/host/crm" className="flex items-center gap-1 hover:text-brand-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> CRM Ospiti
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{ospite.cognome} {ospite.nome}</span>
      </div>
      <DettaglioOspite ospiteId={ospite.id} />
    </div>
  )
}
