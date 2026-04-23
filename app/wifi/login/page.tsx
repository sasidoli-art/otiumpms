import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import WifiLoginClient from './wifi-login-client'

export const metadata = { title: 'Wi-Fi Ospiti — Login' }

type SearchParams = Promise<{
  h?: string
  // Parametri wifidog (quando arriviamo da captive portal intercept)
  wd_gw_address?: string
  wd_gw_port?: string
  wd_gw_id?: string
  wd_mac?: string
  wd_url?: string
}>

export default async function WifiLoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const hostId = typeof params.h === 'string' ? params.h : null

  if (!hostId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
        <div className="card max-w-sm text-center">
          <p className="text-sm text-gray-700">Link non valido.</p>
        </div>
      </div>
    )
  }

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
      wifiRedirectUrl: true,
      wifiWelcomeMessage: true,
    },
  })

  if (!host || !isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
        <div className="card max-w-sm text-center">
          <p className="text-sm text-gray-700">Struttura non trovata o Wi-Fi non disponibile.</p>
        </div>
      </div>
    )
  }

  // Se arriviamo da un intercept wifidog, prepariamo i params per il redirect-back
  const wifidog =
    params.wd_gw_address && params.wd_gw_port
      ? {
          gwAddress: params.wd_gw_address,
          gwPort: params.wd_gw_port,
          gwId: params.wd_gw_id ?? '',
          mac: params.wd_mac ?? '',
          originalUrl: params.wd_url ?? '',
        }
      : null

  return (
    <WifiLoginClient
      hostId={host.id}
      hostNome={host.nomeAzienda}
      wifidog={wifidog}
      authMethods={{
        pms: host.wifiAuthPms,
        code: host.wifiAuthCode,
        complimentary: host.wifiAuthComplimentary,
        complimentaryMins: host.wifiComplimentaryMins,
        userForm: host.wifiAuthUserForm,
        emailOnly: host.wifiAuthEmailOnly,
      }}
      redirectUrl={host.wifiRedirectUrl}
      welcomeMessage={host.wifiWelcomeMessage}
    />
  )
}
