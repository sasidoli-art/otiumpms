import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { isHostAuthorized } from '@/lib/permissions'

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')

  const host = session.user.role === 'HOST'
    ? await prisma.host.findUnique({ where: { userId: session.user.id }, select: { onboardingCompletato: true, onboardingStep: true, onboardingData: true, nomeAzienda: true } })
    : await prisma.host.findFirst({ select: { onboardingCompletato: true, onboardingStep: true, onboardingData: true, nomeAzienda: true } })

  if (host?.onboardingCompletato || (host?.onboardingStep ?? 0) >= 5) redirect('/host/dashboard')

  // Parse saved data for resume
  const savedData = host?.onboardingData && typeof host.onboardingData === 'object'
    ? (host.onboardingData as Record<string, unknown>)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <OnboardingWizard
        userName={session.user.name ?? ''}
        userEmail={session.user.email ?? ''}
        currentCompanyName={host?.nomeAzienda ?? ''}
        savedData={savedData as never}
        savedStep={host?.onboardingStep ?? 0}
      />
    </div>
  )
}
