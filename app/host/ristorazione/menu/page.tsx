import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import MenuManager from './menu-manager'

export const metadata = { title: 'Gestione Menu — Host' }

export default async function MenuPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <MenuManager />
}
