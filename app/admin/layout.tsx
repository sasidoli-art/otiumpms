import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BugReportButton } from '@/components/layout/bug-report-button'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/host/dashboard')

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar nomeUtente={session.user.name ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          nomeUtente={session.user.name ?? ''}
          ruolo="ADMIN"
          settingsHref="/admin/impostazioni"
        />
        <main className="flex-1 overflow-y-auto bg-[#f5f6f8] dark:bg-slate-950 p-6">
          {children}
        </main>
      </div>
      <BugReportButton />
    </div>
  )
}
