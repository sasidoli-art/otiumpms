'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Router, Clock, Globe, ArrowLeft, Play, RefreshCw } from 'lucide-react'

const STATO_BADGE = {
  ONLINE:   { variant: 'green',  label: 'Online' },
  OFFLINE:  { variant: 'red',    label: 'Offline' },
  PENDING:  { variant: 'yellow', label: 'Pending' },
  DISABLED: { variant: 'gray',   label: 'Disabilitato' },
} as const

const CMD_BADGE = {
  PENDING: { variant: 'yellow', label: 'In coda' },
  SENT:    { variant: 'blue',   label: 'Inviato' },
  DONE:    { variant: 'green',  label: 'Completato' },
  FAILED:  { variant: 'red',    label: 'Fallito' },
  EXPIRED: { variant: 'gray',   label: 'Scaduto' },
} as const

const ACTIONS = [
  // Diagnostica + status
  { value: 'ping',                 label: 'Ping', params: null },
  { value: 'get_status',           label: 'Stato servizi', params: null },
  { value: 'get_extended_status',  label: 'Stato esteso (CPU/RAM/IF)', params: null },
  { value: 'get_ap_list',          label: 'Lista AP', params: null },
  // MAC whitelist
  { value: 'list_guest_users',     label: 'MAC whitelist', params: null },
  { value: 'add_guest_user',       label: 'Aggiungi MAC', params: 'mac' },
  { value: 'revoke_guest_user',    label: 'Rimuovi MAC', params: 'mac' },
  // Debug + log
  { value: 'pull_logs',            label: 'Pull logs (agent/wifidog/prune/qos/sync)', params: null },
  { value: 'pull_iptables',        label: 'Dump iptables', params: null },
  // Manutenzione (con cautela)
  { value: 'reapply_firewall',     label: 'Riapplica firewall-fix', params: null },
  { value: 'restart_wifidog',      label: 'Restart wifidog (5s downtime)', params: null },
  { value: 'reboot',               label: '⚠️ Reboot router (~70s downtime)', params: null },
  // Agent self-update
  { value: 'update_agent',         label: 'Aggiorna agent', params: null },
]

function formatDate(d: string | null) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 2)  return 'adesso'
  if (min < 60) return `${min}m fa`
  const h = Math.floor(min / 60)
  if (h < 24)   return `${h}h fa`
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

type Device = {
  id: string; alias: string; mac: string; modello: string | null
  firmware: string | null; stato: string; ultimoHeartbeatAt: string | null
  ultimoIpPubblico: string | null; ultimoAgentVersion: string | null; note: string | null
  host: { id: string; nomeAzienda: string }
  struttura: { nome: string } | null
}

type Command = {
  id: string; action: string; payload: Record<string, unknown>
  stato: string; createdAt: string; sentAt: string | null
  doneAt: string | null; result: unknown; errorMsg: string | null
}

export default function WifiDeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const [device, setDevice]   = useState<Device | null>(null)
  const [commands, setCommands] = useState<Command[]>([])
  const [action, setAction]   = useState('ping')
  const [mac, setMac]         = useState('')
  const [sending, startSend]  = useTransition()
  const [msg, setMsg]         = useState<string | null>(null)

  const load = async () => {
    const [dRes, cRes] = await Promise.all([
      fetch(`/api/superadmin/wifi/${id}`),
      fetch(`/api/superadmin/wifi/${id}/commands`),
    ])
    if (dRes.ok) setDevice(await dRes.json().then((r: { device: Device }) => r.device))
    if (cRes.ok) setCommands(await cRes.json().then((r: { commands: Command[] }) => r.commands))
  }

  useEffect(() => { load() }, [id])

  const sendCmd = () => {
    const selected = ACTIONS.find(a => a.value === action)
    const payload = selected?.params === 'mac'
      ? { mac }
      : action === 'update_agent'
        ? { url: `${window.location.origin}/api/wifi/agent/bundle`, version: '0.4' }
        : {}
    startSend(async () => {
      const res = await fetch(`/api/superadmin/wifi/${id}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(`Comando inviato: ${data.commandId}`)
        setMac('')
        load()
      } else {
        setMsg(`Errore: ${data.error}`)
      }
    })
  }

  if (!device) return (
    <div className="flex items-center justify-center h-40 text-gray-400">Caricamento…</div>
  )

  const stCfg = STATO_BADGE[device.stato as keyof typeof STATO_BADGE]
  const selectedAction = ACTIONS.find(a => a.value === action)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/superadmin/wifi" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Router className="w-5 h-5 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{device.alias}</h1>
          <Badge variant={stCfg.variant as 'green' | 'red' | 'yellow' | 'gray'}>{stCfg.label}</Badge>
        </div>
      </div>

      {/* Info card */}
      <div className="card grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 mb-1">MAC</p>
          <p className="font-mono text-gray-700 dark:text-slate-200">{device.mac}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Modello</p>
          <p className="text-gray-700 dark:text-slate-200">{device.modello ?? '—'}{device.firmware ? ` · ${device.firmware}` : ''}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Host</p>
          <Link href={`/superadmin/host/${device.host.id}`} className="text-brand-600 hover:underline">
            {device.host.nomeAzienda}
          </Link>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Struttura</p>
          <p className="text-gray-700 dark:text-slate-200">{device.struttura?.nome ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Ultimo heartbeat</p>
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatDate(device.ultimoHeartbeatAt)}</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">IP pubblico</p>
          <div className="flex items-center gap-1 text-gray-500 font-mono text-xs">
            <Globe className="w-3 h-3" />
            <span>{device.ultimoIpPubblico ?? '—'}</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Agent version</p>
          <p className="text-gray-700 dark:text-slate-200">{device.ultimoAgentVersion ?? '—'}</p>
        </div>
        {device.note && (
          <div className="col-span-2">
            <p className="text-xs text-gray-400 mb-1">Note</p>
            <p className="text-gray-500">{device.note}</p>
          </div>
        )}
      </div>

      {/* Invia comando */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-slate-100">Invia comando</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Azione</label>
            <select value={action} onChange={e => setAction(e.target.value)} className="input text-sm">
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          {selectedAction?.params === 'mac' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">MAC address</label>
              <input
                type="text" value={mac} onChange={e => setMac(e.target.value)}
                placeholder="es. AA:BB:CC:DD:EE:FF"
                className="input text-sm w-52"
              />
            </div>
          )}
          <button
            onClick={sendCmd}
            disabled={sending || (selectedAction?.params === 'mac' && !mac)}
            className="btn btn-primary text-sm flex items-center gap-1"
          >
            <Play className="w-3 h-3" />
            {sending ? 'Invio…' : 'Invia'}
          </button>
          <button onClick={load} className="btn btn-ghost text-sm flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Aggiorna
          </button>
        </div>
        {msg && (
          <p className="text-sm text-gray-500 font-mono">{msg}</p>
        )}
      </div>

      {/* Storico comandi */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Storico comandi</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Azione</th>
                <th className="table-th">Stato</th>
                <th className="table-th">Creato</th>
                <th className="table-th">Completato</th>
                <th className="table-th">Risultato / Errore</th>
              </tr>
            </thead>
            <tbody>
              {commands.map(c => {
                const cc = CMD_BADGE[c.stato as keyof typeof CMD_BADGE]
                return (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-slate-800">
                    <td className="table-td font-mono text-xs">{c.action}</td>
                    <td className="table-td">
                      <Badge variant={cc.variant as 'green' | 'red' | 'yellow' | 'gray' | 'blue'}>
                        {cc.label}
                      </Badge>
                    </td>
                    <td className="table-td text-gray-400 text-xs">{formatDate(c.createdAt)}</td>
                    <td className="table-td text-gray-400 text-xs">{formatDate(c.doneAt)}</td>
                    <td className="table-td font-mono text-xs text-gray-500 max-w-xs truncate">
                      {c.errorMsg
                        ? <span className="text-red-500">{c.errorMsg}</span>
                        : c.result
                          ? JSON.stringify(c.result).slice(0, 120)
                          : '—'
                      }
                    </td>
                  </tr>
                )
              })}
              {commands.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-td py-8 text-center text-gray-400">
                    Nessun comando
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
