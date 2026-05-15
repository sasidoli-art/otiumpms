import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import type { SplashConfig } from '@/lib/wifi/splash-config'
import { renderSplashHtml } from '@/lib/wifi/splash-renderer'
import WelcomePageEditor from './welcome-page-editor'

export const metadata = { title: 'Welcome page Wi-Fi — Otium' }

export default async function WelcomePageRoute() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true, nomeAzienda: true, moduliAttivi: true, splashConfig: true },
  })
  if (!host) redirect('/host/dashboard')
  if (!isModuloAttivo(host.moduliAttivi, 'wifi')) redirect('/host/moduli')

  const config = (host.splashConfig ?? {}) as SplashConfig
  const initialHtml = renderSplashHtml(host.nomeAzienda, config)

  return (
    <WelcomePageEditor
      hostNomeAzienda={host.nomeAzienda}
      initialConfig={config}
      initialHtml={initialHtml}
    />
  )
}
