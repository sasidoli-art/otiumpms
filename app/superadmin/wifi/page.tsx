import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Wifi, Router, Clock, Globe } from 'lucide-react'

const STATO_BADGE = {
  ONLINE:   { variant: 'green',  label: 'Online' },
  OFFLINE:  { variant: 'red',    label: 'Offline' },
  PENDING:  { variant: 'yellow', label: 'Pending' },
  DISABLED: { variant: 'gray',   label: 'Disabilitato' },
} as const

function formatDate(d: Date | null) {
  if (!d) return '—'
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 2)   return 'adesso'
  if (min < 60)  return `${min}m fa`
  const h = Math.floor(min / 60)
  if (h < 24)    return `${h}h fa`
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default async function WifiPage({
  searchParams,
}: {
  searchParams: { stato?: string; host?: string }
}) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  const { stato = '', host: hostId = '' } = searchParams

  const [devices, hosts] = await Promise.all([
    prisma.wifiDevice.findMany({
      where: {
        ...(stato ? { stato: stato as 'PENDING' | 'ONLINE' | 'OFFLINE' | 'DISABLED' } : {}),
        ...(hostId ? { hostId } : {}),
      },
      select: {
        id: true,
        alias: true,
        mac: true,
        modello: true,
        firmware: true,
        stato: true,
        ultimoHeartbeatAt: true,
        ultimoIpPubblico: true,
        ultimoAgentVersion: true,
        note: true,
        createdAt: true,
        host: { select: { id: true, nomeAzienda: true } },
        struttura: { select: { nome: true } },
        _count: { select: { guestUsers: true, accessLogs: true } },
      },
      orderBy: [{ stato: 'asc' }, { alias: 'asc' }],
    }),
    prisma.host.findMany({ select: { id: true, nomeAzienda: true }, orderBy: { nomeAzienda: 'asc' } }),
  ])

  const totaleOnline = devices.filter(d => d.stato === 'ONLINE').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Router Wi-Fi</h1>
          <p className="text-sm text-gray-500">
            {devices.length} device registrati · {totaleOnline} online
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['ONLINE', 'OFFLINE', 'PENDING', 'DISABLED'] as const).map(s => {
          const count = devices.filter(d => d.stato === s).length
          const cfg = STATO_BADGE[s]
          return (
            <Link
              key={s}
              href={`/superadmin/wifi?stato=${s}${hostId ? `&host=${hostId}` : ''}`}
              className="card flex items-center gap-3 hover:ring-1 hover:ring-brand-300 transition-all"
            >
              <Badge variant={cfg.variant as 'green' | 'red' | 'yellow' | 'gray'}>{cfg.label}</Badge>
              <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">{count}</span>
            </Link>
          )
        })}
      </div>

      {/* Filtri */}
      <div className="card">
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stato</label>
            <select name="stato" defaultValue={stato} className="input text-sm">
              <option value="">Tutti</option>
              {(['ONLINE', 'OFFLINE', 'PENDING', 'DISABLED'] as const).map(s => (
                <option key={s} value={s}>{STATO_BADGE[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Host</label>
            <select name="host" defaultValue={hostId} className="input text-sm">
              <option value="">Tutti</option>
              {hosts.map(h => (
                <option key={h.id} value={h.id}>{h.nomeAzienda}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary text-sm">Filtra</button>
          <Link href="/superadmin/wifi" className="btn btn-ghost text-sm">Reset</Link>
        </form>
      </div>

      {/* Tabella */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Device</th>
                <th className="table-th">MAC</th>
                <th className="table-th">Host</th>
                <th className="table-th">Struttura</th>
                <th className="table-th">Stato</th>
                <th className="table-th">Ultimo heartbeat</th>
                <th className="table-th">IP pubblico</th>
                <th className="table-th text-right">Guest</th>
                <th className="table-th text-right">Log</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => {
                const cfg = STATO_BADGE[d.stato]
                return (
                  <tr
                    key={d.id}
                    className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <Router className="w-4 h-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{d.alias}</p>
                          {d.modello && (
                            <p className="text-[11px] text-gray-400">{d.modello}{d.firmware ? ` · ${d.firmware}` : ''}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-td font-mono text-xs text-gray-500">{d.mac}</td>
                    <td className="table-td">
                      <Link
                        href={`/superadmin/host/${d.host.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {d.host.nomeAzienda}
                      </Link>
                    </td>
                    <td className="table-td text-gray-500">{d.struttura?.nome ?? '—'}</td>
                    <td className="table-td">
                      <Badge variant={cfg.variant as 'green' | 'red' | 'yellow' | 'gray'}>
                        {cfg.label}
                      </Badge>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{formatDate(d.ultimoHeartbeatAt)}</span>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 text-gray-500 font-mono text-xs">
                        <Globe className="w-3 h-3 shrink-0" />
                        <span>{d.ultimoIpPubblico ?? '—'}</span>
                      </div>
                    </td>
                    <td className="table-td text-right font-medium">{d._count.guestUsers}</td>
                    <td className="table-td text-right text-gray-500">{d._count.accessLogs}</td>
                  </tr>
                )
              })}
              {devices.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-td py-12 text-center">
                    <Wifi className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400">Nessun device trovato</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
