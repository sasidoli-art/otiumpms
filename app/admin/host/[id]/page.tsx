import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import HostDettaglio from '@/components/admin/host-dettaglio'

export default async function AdminHostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) redirect('/login')
  const { id } = await params

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/host" className="flex items-center gap-1 hover:text-brand-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Host
        </Link>
      </div>
      <HostDettaglio id={id} />
    </div>
  )
}
