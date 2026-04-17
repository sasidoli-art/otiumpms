import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { isHostAuthorized } from '@/lib/permissions'

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')

  // Check if already completed
  const host = session.user.role === 'HOST'
    ? await prisma.host.findUnique({ where: { userId: session.user.id }, select: { onboardingCompletato: true, onboardingStep: true, nomeAzienda: true } })
    : await prisma.host.findFirst({ select: { onboardingCompletato: true, onboardingStep: true, nomeAzienda: true } })

  if (host?.onboardingCompletato || (host?.onboardingStep ?? 0) >= 5) redirect('/host/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <OnboardingWizard
        userName={session.user.name ?? ''}
        currentCompanyName={host?.nomeAzienda ?? ''}
      />
    </div>
  )
}
