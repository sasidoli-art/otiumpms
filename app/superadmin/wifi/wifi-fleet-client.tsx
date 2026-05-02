'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { Wifi, ExternalLink, Plus, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Device = {
  id: string
  alias: string
  mac: string
  modello: string | null
  firmware: string | null
  stato: string
  hostId: string
  strutturaId: string | null
  host: { nomeAzienda: string }
  struttura: { nome: string } | null
  ultimoHeartbeatAt: string | null
  ultimoIpPubblico: string | null
  ultimoAgentVersion: string | null
  commandsCount: number
  guestUsersCount: number
  createdAt: string
}

type Host = { id: string; nomeAzienda: string }

const STATO_COLORI: Record<string, BadgeVariant> = {
  ONLINE: 'green',
  PENDING: 'yellow',
  OFFLINE: 'gray',
  ERRORE: 'red',
  REVOCATO: 'red',
}

const STATI = ['ONLINE', 'PENDING', 'OFFLINE', 'ERRORE', 'REVOCATO']
const MODELLI = ['CF-AC50', 'CF-AC100', 'CF-AC101', 'CF-AC300']

function formatLastSeen(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s fa`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m fa`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h fa`
  return `${Math.floor(diffSec / 86400)}g fa`
}

export default function WifiFleetClient({
  devices,
  hosts,
  stateCounts,
  filtroHost,
  filtroStato,
  filtroModello,
}: {
  devices: Device[]
  hosts: Host[]
  stateCounts: Record<string, number>
  filtroHost: string
  filtroStato: string
  filtroModello: string
}) {
  const router = useRouter()

  function changeFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/superadmin/wifi?${params.toString()}`)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wifi className="h-6 w-6 text-indigo-600" />
            Wi-Fi Fleet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {devices.length} device totali ·
            <span className="text-green-600 font-medium ml-1">{stateCounts.ONLINE ?? 0} online</span> ·
            <span className="text-yellow-600 font-medium ml-1">{stateCounts.PENDING ?? 0} pending</span> ·
            <span className="text-gray-500 font-medium ml-1">{stateCounts.OFFLINE ?? 0} offline</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-accent text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Aggiorna
          </button>
          <Link
            href="/superadmin/wifi/onboard"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nuovo router
          </Link>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap items-center bg-muted/30 p-3 rounded-lg">
        <span className="text-xs font-medium text-muted-foreground uppercase">Filtri:</span>
        <select
          value={filtroHost}
          onChange={(e) => changeFilter('host', e.target.value)}
          className="text-sm rounded-md border px-2 py-1 bg-background"
        >
          <option value="">Tutti gli host</option>
          {hosts.map(h => (
            <option key={h.id} value={h.id}>{h.nomeAzienda}</option>
          ))}
        </select>
        <select
          value={filtroStato}
          onChange={(e) => changeFilter('stato', e.target.value)}
          className="text-sm rounded-md border px-2 py-1 bg-background"
        >
          <option value="">Tutti gli stati</option>
          {STATI.map(s => (
            <option key={s} value={s}>{s} ({stateCounts[s] ?? 0})</option>
          ))}
        </select>
        <select
          value={filtroModello}
          onChange={(e) => changeFilter('modello', e.target.value)}
          className="text-sm rounded-md border px-2 py-1 bg-background"
        >
          <option value="">Tutti i modelli</option>
          {MODELLI.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Tabella */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Alias</th>
              <th className="px-4 py-3 text-left">Host / Struttura</th>
              <th className="px-4 py-3 text-left">Modello</th>
              <th className="px-4 py-3 text-left">MAC</th>
              <th className="px-4 py-3 text-left">Stato</th>
              <th className="px-4 py-3 text-left">Last seen</th>
              <th className="px-4 py-3 text-left">IP pubblico</th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {devices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  Nessun device corrispondente ai filtri.{' '}
                  <Link href="/superadmin/wifi/onboard" className="text-indigo-600 hover:underline">
                    Onboard il primo →
                  </Link>
                </td>
              </tr>
            ) : (
              devices.map(d => (
                <tr key={d.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{d.alias}</td>
                  <td className="px-4 py-3">
                    <div>{d.host.nomeAzienda}</div>
                    {d.struttura && (
                      <div className="text-xs text-muted-foreground">{d.struttura.nome}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono">{d.modello ?? '—'}</span>
                    {d.firmware && (
                      <div className="text-xs text-muted-foreground">{d.firmware}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {d.mac.startsWith('PENDING-') ? (
                      <span className="text-yellow-600">{d.mac}</span>
                    ) : (
                      d.mac
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATO_COLORI[d.stato] ?? 'gray'}>{d.stato}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">{formatLastSeen(d.ultimoHeartbeatAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.ultimoIpPubblico ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/host/${d.hostId}`}
                      className="text-indigo-600 hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      Host <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        I device <span className="font-mono text-yellow-600">PENDING-*</span> sono stati onboardati ma non hanno ancora fatto il primo heartbeat. Al primo contatto del router, il MAC reale sostituirà il placeholder e lo stato passerà a <Badge variant="green">ONLINE</Badge>.
      </p>
    </div>
  )
}
