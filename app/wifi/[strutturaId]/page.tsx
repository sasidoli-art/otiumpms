import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Wi-Fi Ospiti' }

/**
 * Alias path-based → query-based: `/wifi/[strutturaId]` → `/wifi/login?h=hostId`.
 *
 * Il captive portal produttivo (router wifidog + agent Comfast) usa l'URL
 * `/wifi/login?h=<hostId>&wd_*`. Questo alias permette di distribuire link
 * umani-friendly per-struttura (QR code nelle camere, badge reception)
 * preservando tutti i query param (wifidog gw/mac/url) per non rompere il
 * flusso captive reale.
 *
 * Nota: `HostWifiConfig` è per-host, quindi strutture diverse dello stesso
 * host condividono la config Wi-Fi. L'alias qui traduce strutturaId → hostId.
 */
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function WifiStrutturaAliasPage({
  params: paramsPromise,
  searchParams,
}: {
  params: Promise<{ strutturaId: string }>
  searchParams: SearchParams
}) {
  const { strutturaId } = await paramsPromise
  const sp = await searchParams

  const struttura = await prisma.struttura.findUnique({
    where: { id: strutturaId },
    select: { hostId: true },
  })

  if (!struttura) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
        <div className="card max-w-sm text-center">
          <p className="text-sm text-gray-700">Struttura non trovata.</p>
        </div>
      </div>
    )
  }

  // Preserva tutti i query param esistenti (wifidog: wd_gw_address, wd_mac, ecc.)
  const qs = new URLSearchParams()
  qs.set('h', struttura.hostId)
  for (const [key, value] of Object.entries(sp)) {
    if (key === 'h') continue // il nostro host sovrasta
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value.length > 0) qs.set(key, value[0])
  }

  redirect(`/wifi/login?${qs.toString()}`)
}
