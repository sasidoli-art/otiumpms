import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import WifiClient from './wifi-client'

export const metadata = { title: 'Wi-Fi Ospiti — Otium' }

export default async function WifiHostPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      id: true,
      nomeAzienda: true,
      moduliAttivi: true,
      wifiAuthPms: true,
      wifiAuthCode: true,
      wifiAuthComplimentary: true,
      wifiComplimentaryMins: true,
      wifiAuthUserForm: true,
      wifiAuthEmailOnly: true,
      wifiAuthSocial: true,
      wifiRedirectUrl: true,
      wifiWelcomeMessage: true,
    },
  })
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
        authPms: host.wifiAuthPms,
        authCode: host.wifiAuthCode,
        authComplimentary: host.wifiAuthComplimentary,
        complimentaryMins: host.wifiComplimentaryMins,
        authUserForm: host.wifiAuthUserForm,
        authEmailOnly: host.wifiAuthEmailOnly,
        authSocial: host.wifiAuthSocial,
        redirectUrl: host.wifiRedirectUrl,
        welcomeMessage: host.wifiWelcomeMessage,
      }}
    />
  )
}
