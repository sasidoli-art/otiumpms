import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import ModuliManager from './moduli-manager'

export const metadata = { title: 'Moduli — Host' }

export default async function ModuliPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <ModuliManager />
}
