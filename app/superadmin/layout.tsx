import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SuperAdminSidebar } from '@/components/superadmin/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <SuperAdminSidebar nomeUtente={session.user.name ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          nomeUtente={session.user.name ?? ''}
          ruolo="ADMIN"
          settingsHref="/superadmin/impostazioni"
        />
        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-950 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
