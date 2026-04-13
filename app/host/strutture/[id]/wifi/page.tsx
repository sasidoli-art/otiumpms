import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wifi, AlertCircle } from 'lucide-react'
import { isHostAuthorized } from '@/lib/permissions'
import { isModuloAttivo } from '@/lib/moduli'
import WifiSplashForm from './wifi-splash-form'

export default async function WifiStrutturaPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { moduliAttivi: true },
  })

  const moduloAttivo = isModuloAttivo(host?.moduliAttivi, 'wifi')

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId },
    select: {
      id: true,
      nome: true,
      logo: true,
      colorePrimario: true,
      coloreSecondario: true,
      fotoHero: true,
      linkSitoWeb: true,
    },
  })
  if (!struttura) notFound()

  const devices = await prisma.wifiDevice.findMany({
    where: { hostId, strutturaId: struttura.id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/host/strutture/${struttura.id}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wifi className="w-6 h-6 text-indigo-600" />
            Wi-Fi Guest — {struttura.nome}
          </h1>
          <p className="text-sm text-gray-600">
            Gestione access point, captive portal e utenti Wi-Fi della struttura.
          </p>
        </div>
      </div>

      {!moduloAttivo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Modulo Wi-Fi non attivo</p>
            <p className="text-sm text-amber-800">
              Per abilitarlo vai in{' '}
              <Link href="/host/moduli" className="underline">
                Moduli
              </Link>{' '}
              e attiva &quot;Wi-Fi Guest &amp; Captive Portal&quot;.
            </p>
          </div>
        </div>
      )}

      {moduloAttivo && devices.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="font-medium">Nessun dispositivo Wi-Fi registrato</p>
          <p className="text-sm text-gray-600 mt-1">
            Registra il controller Comfast della struttura per iniziare.
          </p>
        </div>
      )}

      {moduloAttivo && devices.length > 0 && (
        <div className="space-y-6">
          {devices.map((device) => (
            <div key={device.id} className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{device.alias}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {device.mac} · {device.modello || 'Modello sconosciuto'}
                    </p>
                  </div>
                  <StatoBadge stato={device.stato} />
                </div>
              </div>
              <div className="p-6">
                <WifiSplashForm
                  deviceMac={device.mac}
                  initialConfig={(device.splashConfig as Record<string, unknown>) || {}}
                  strutturaDefaults={{
                    titolo: struttura.nome,
                    logoUrl: struttura.logo || undefined,
                    slideshowUrls: struttura.fotoHero ? [struttura.fotoHero] : undefined,
                    linkRedirect: struttura.linkSitoWeb || undefined,
                    colorePrimario: struttura.colorePrimario || undefined,
                    coloreSecondario: struttura.coloreSecondario || undefined,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatoBadge({ stato }: { stato: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ONLINE:  { label: 'Online',   cls: 'bg-green-100 text-green-800' },
    OFFLINE: { label: 'Offline',  cls: 'bg-red-100 text-red-800' },
    PENDING: { label: 'In attesa',cls: 'bg-amber-100 text-amber-800' },
    DISABLED:{ label: 'Disattivo',cls: 'bg-gray-100 text-gray-700' },
  }
  const s = map[stato] || map.PENDING
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
  )
}
