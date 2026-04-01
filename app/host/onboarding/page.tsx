import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { OnboardingWizard } from './onboarding-wizard'

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'HOST' && session.user.role !== 'ADMIN') redirect('/login')

  // Check if already completed
  const host = session.user.role === 'HOST'
    ? await prisma.host.findUnique({ where: { userId: session.user.id }, select: { onboardingCompletato: true, nomeAzienda: true } })
    : await prisma.host.findFirst({ select: { onboardingCompletato: true, nomeAzienda: true } })

  if (host?.onboardingCompletato) redirect('/host/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <OnboardingWizard
        userName={session.user.name ?? ''}
        currentCompanyName={host?.nomeAzienda ?? ''}
      />
    </div>
  )
}
