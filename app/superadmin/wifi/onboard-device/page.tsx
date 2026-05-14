import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import OnboardDeviceForm from './onboard-form'

export const metadata = { title: 'Onboard nuovo router — Otium SuperAdmin' }

export default async function OnboardDevicePage() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  const hosts = await prisma.host.findMany({
    select: {
      id: true,
      nomeAzienda: true,
      moduliAttivi: true,
      strutture: { select: { id: true, nome: true } },
    },
    orderBy: { nomeAzienda: 'asc' },
  })

  // Solo host con modulo Wi-Fi attivo
  const wifiHosts = hosts.filter(h => {
    const m = h.moduliAttivi as { wifi?: boolean } | null
    return m && m.wifi === true
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">Onboard nuovo router</h1>
      <p className="text-sm text-gray-500 mb-6">
        Carica il backup factory scaricato dalla Web UI del router, compila i campi e ottieni
        in download il file patchato pronto per il restore. Niente SSH, niente CF-AC300 builder.
      </p>

      <OnboardDeviceForm hosts={wifiHosts} />

      <details className="mt-8 border rounded-lg p-4 bg-gray-50">
        <summary className="text-sm font-medium cursor-pointer">Come scaricare il factory backup</summary>
        <div className="mt-3 text-sm text-gray-700 space-y-2">
          <p>1. Connetti il nuovo router via Ethernet (IP default <code className="bg-white px-1">192.168.10.1</code>)</p>
          <p>2. Accedi alla Web UI: utente <code className="bg-white px-1">admin</code>, password <code className="bg-white px-1">admin</code></p>
          <p>3. Menu <strong>System Tools → Manage Config</strong></p>
          <p>4. Clicca <strong>Backup/Download</strong> → salva il file (estensione <code className="bg-white px-1">.file</code>)</p>
          <p>5. Carica quel file qui sopra</p>
        </div>
      </details>

      <details className="mt-3 border rounded-lg p-4 bg-gray-50">
        <summary className="text-sm font-medium cursor-pointer">Cosa succede dopo il download</summary>
        <div className="mt-3 text-sm text-gray-700 space-y-2">
          <p>1. Torna sulla Web UI del router → <strong>Manage Config → Restore</strong></p>
          <p>2. Carica il file patchato → riavvio (~60 sec)</p>
          <p>3. Dopo riavvio, da PC operatore:</p>
          <pre className="bg-gray-900 text-green-300 p-3 rounded text-xs overflow-x-auto">
{`cd C:/PROGETTI/router_comfast
ROUTER_IP=<nuovo-ip-router> \\
bash provisioning/deploy-from-pc.sh`}
          </pre>
          <p>4. Test dal telefono: SSID guest → captive portal → login con codice/prenotazione</p>
        </div>
      </details>
    </div>
  )
}
