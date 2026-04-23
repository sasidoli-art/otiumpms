import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { Shield } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') redirect('/host/dashboard')

  return (
    <>
      {/* Banner platform */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <p className="text-xs font-semibold tracking-wide">
            Pannello amministrazione Otium · operatore piattaforma
          </p>
        </div>
      </div>
      <AdminShell nomeUtente={session.user.name ?? ''} userRole={session.user.role}>
        {children}
      </AdminShell>
    </>
  )
}
