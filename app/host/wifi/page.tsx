import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import { getWifiConfig } from '@/lib/host-config'
import WifiClient from './wifi-client'

export const metadata = { title: 'Wi-Fi Ospiti — Otium' }

export default async function WifiHostPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const [host, wifi] = await Promise.all([
    prisma.host.findUnique({
      where: { id: hostId },
      select: { id: true, nomeAzienda: true, moduliAttivi: true },
    }),
    getWifiConfig(hostId),
  ])
  if (!host) redirect('/host/dashboard')

  if (!isModuloAttivo(host.moduliAttivi, 'wifi')) {
    redirect('/host/moduli')
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'

  return (
    <WifiClient
      hostId={host.id}
      hostNome={host.nomeAzienda}
      loginUrl={`${origin}/wifi/login?h=${host.id}`}
      wifiConfig={{
        authPms: wifi?.wifiAuthPms ?? false,
        authCode: wifi?.wifiAuthCode ?? false,
        authComplimentary: wifi?.wifiAuthComplimentary ?? false,
        complimentaryMins: wifi?.wifiComplimentaryMins ?? 120,
        authUserForm: wifi?.wifiAuthUserForm ?? false,
        authEmailOnly: wifi?.wifiAuthEmailOnly ?? false,
        authSocial: wifi?.wifiAuthSocial ?? false,
        redirectUrl: wifi?.wifiRedirectUrl ?? null,
        welcomeMessage: wifi?.wifiWelcomeMessage ?? null,
      }}
    />
  )
}
