import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') redirect('/host/dashboard')

  return (
    <AdminShell nomeUtente={session.user.name ?? ''}>
      {children}
    </AdminShell>
  )
}
