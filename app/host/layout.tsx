import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { HostSidebar } from '@/components/host/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'HOST' && session.user.role !== 'ADMIN') redirect('/login')

  // Per ADMIN: prende il primo host disponibile per impersonare
  const host = session.user.role === 'HOST'
    ? await prisma.host.findUnique({ where: { userId: session.user.id }, select: { nomeAzienda: true, id: true } })
    : await prisma.host.findFirst({ select: { nomeAzienda: true, id: true } })

  return (
    <div className="flex h-screen overflow-hidden">
      <HostSidebar
        nomeUtente={session.user.name ?? ''}
        nomeAzienda={host?.nomeAzienda ?? 'La mia azienda'}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          nomeUtente={session.user.name ?? ''}
          ruolo="HOST"
          settingsHref="/host/profilo"
        />
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
