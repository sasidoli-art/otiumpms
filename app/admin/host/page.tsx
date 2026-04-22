import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import HostLista from '@/components/admin/host-lista'

export default async function AdminHostPage() {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  return <HostLista />
}
