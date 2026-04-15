import { getPlatformSettings } from '@/lib/platform-settings'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PlatformAiClient from './platform-ai-client'

export const metadata = { title: 'AI Provider — SuperAdmin' }

// Forza SSR — mai pre-renderizzata staticamente
export const dynamic = 'force-dynamic'

export default async function PlatformAiPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') redirect('/login')

  const settings = await getPlatformSettings()

  return (
    <PlatformAiClient
      initial={{
        aiProvider: settings.aiProvider,
        aiModel: settings.aiModel,
        aiBaseUrl: settings.aiBaseUrl,
        aiApiKeySet: !!settings.aiApiKey,
        updatedAt: settings.updatedAt.toISOString(),
      }}
    />
  )
}
