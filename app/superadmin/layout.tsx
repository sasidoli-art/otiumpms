import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SuperAdminShell } from '@/components/superadmin/superadmin-shell'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') redirect('/login')

  return (
    <SuperAdminShell nomeUtente={session.user.name ?? ''}>
      {children}
    </SuperAdminShell>
  )
}
