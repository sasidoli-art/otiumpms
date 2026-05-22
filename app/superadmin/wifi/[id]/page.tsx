'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Router, Clock, Globe, ArrowLeft, Play, RefreshCw, Cpu, MemoryStick, Wifi, Server, Eye } from 'lucide-react'

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

// ─── Renderer custom per ogni action type ────────────────────────────────

function MetricBox({ icon: Icon, label, value, color = 'gray' }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  color?: 'gray' | 'green' | 'red' | 'yellow' | 'blue'
}) {
  const colorMap = {
    gray: 'text-gray-600 dark:text-slate-300',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    blue: 'text-blue-600 dark:text-blue-400',
  }
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 bg-gray-50 dark:bg-slate-800/50">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </div>
      <div className={`text-lg font-semibold ${colorMap[color]}`}>{value}</div>
    </div>
  )
}

function LogBlock({ title, content }: { title: string; content: string }) {
  const lines = content.split('|').filter(l => l.trim())
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title} <span className="text-gray-400 font-normal normal-case">({lines.length} righe)</span></h3>
      <pre className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
        {lines.length > 0 ? lines.join('\n') : <span className="text-gray-400 italic">(vuoto)</span>}
      </pre>
    </div>
  )
}

function CommandResultView({ cmd }: { cmd: Command }) {
  if (cmd.errorMsg) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-red-600">Errore</h3>
        <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 whitespace-pre-wrap">
          {cmd.errorMsg}
        </pre>
      </div>
    )
  }

  if (!cmd.result) {
    return <p className="text-sm text-gray-400 italic">Nessun risultato</p>
  }

  const r = cmd.result as Record<string, unknown>

  // ─── get_extended_status ─────────────────────────────────────────────
  if (cmd.action === 'get_extended_status') {
    const cpu = Number(r.cpuPercent ?? 0)
    const mem = Number(r.memPercent ?? 0)
    const uptime = Number(r.uptimeSec ?? 0)
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const mins = Math.floor((uptime % 3600) / 60)
    const uptimeStr = days > 0 ? `${days}g ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricBox icon={Cpu} label="CPU" value={`${cpu}%`} color={cpu > 70 ? 'red' : cpu > 40 ? 'yellow' : 'green'} />
          <MetricBox icon={MemoryStick} label="Memoria" value={`${mem}%`} color={mem > 80 ? 'red' : mem > 60 ? 'yellow' : 'green'} />
          <MetricBox icon={Clock} label="Uptime" value={uptimeStr} />
          <MetricBox icon={Wifi} label="AP gestiti" value={String(r.apCount ?? 0)} />
          <MetricBox icon={Wifi} label="Client connessi" value={String(r.clientCount ?? 0)} color={Number(r.clientCount ?? 0) > 0 ? 'green' : 'gray'} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricBox icon={Globe} label="WAN IP" value={<span className="font-mono text-sm">{String(r.wanIp || '—')}</span>} />
          <MetricBox icon={Globe} label="LAN IP" value={<span className="font-mono text-sm">{String(r.lanIp || '—')}</span>} />
          <MetricBox icon={Globe} label="Guest IP" value={<span className="font-mono text-sm">{String(r.guestIp || '—')}</span>} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MetricBox icon={Server} label="wifidog" value={r.wifidog ? '✅ running' : '❌ down'} color={r.wifidog ? 'green' : 'red'} />
          <MetricBox icon={Server} label="stunnel" value={r.stunnel ? '✅ running' : '❌ down'} color={r.stunnel ? 'green' : 'red'} />
          <MetricBox icon={Router} label="AC mode" value={<span className="text-sm">{String(r.acMode || 'unknown')}</span>} />
        </div>
      </div>
    )
  }

  // ─── pull_logs ───────────────────────────────────────────────────────
  if (cmd.action === 'pull_logs') {
    return (
      <div className="space-y-3">
        <LogBlock title="otium-agent (syslog)"   content={String(r.agent || '')} />
        <LogBlock title="wifidog (syslog)"       content={String(r.wifidog || '')} />
        <LogBlock title="otium-session-prune"    content={String(r.prune || '')} />
        <LogBlock title="otium-sync"             content={String(r.sync || '')} />
        <LogBlock title="otium-qos-comfast"      content={String(r.qos || '')} />
      </div>
    )
  }

  // ─── pull_iptables ───────────────────────────────────────────────────
  if (cmd.action === 'pull_iptables') {
    return (
      <div className="space-y-3">
        <LogBlock title="nat table"    content={String(r.nat || '')} />
        <LogBlock title="mangle table" content={String(r.mangle || '')} />
        <LogBlock title="filter table" content={String(r.filter || '')} />
      </div>
    )
  }

  // ─── get_ap_list ─────────────────────────────────────────────────────
  if (cmd.action === 'get_ap_list') {
    const aps = (r.aps as { list_all?: Array<Record<string, unknown>> })?.list_all ?? []
    if (!Array.isArray(aps) || aps.length === 0) {
      return <p className="text-sm text-gray-400 italic">Nessun AP collegato</p>
    }
    return (
      <div className="space-y-3">
        {aps.map((ap, i) => {
          const vifs = (ap.vif as Array<Record<string, unknown>>) || []
          const totalClients = vifs.reduce((s, v) => s + Number(v.staCount || 0), 0)
          return (
            <div key={i} className="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                <span className="font-semibold">{String(ap.product || 'AP')}</span>
                <span className="font-mono text-xs text-gray-500">{String(ap.mac || '—')}</span>
                <Badge variant={ap.offline_flag === 'online' ? 'green' : 'red'}>
                  {String(ap.offline_flag || '—')}
                </Badge>
                <span className="text-xs text-gray-400">uptime {Math.floor(Number(ap.uptime || 0) / 60)}m</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                <div><span className="text-gray-400">WAN:</span> <span className="font-mono">{String(ap.wan_ip || '—')}</span></div>
                <div><span className="text-gray-400">LAN:</span> <span className="font-mono">{String(ap.lan_ip || '—')}</span></div>
                <div><span className="text-gray-400">Firmware:</span> <span className="font-mono">{String(ap.soft_version || '—')}</span></div>
                <div><span className="text-gray-400">Client tot:</span> <span className="font-semibold">{totalClients}</span></div>
              </div>
              <div className="space-y-1">
                {vifs.filter(v => !v.disabled).map((v, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-slate-800/50 rounded px-2 py-1">
                    <Wifi className="w-3 h-3 text-gray-400" />
                    <span className="font-mono">{String(v.ssid || '')}</span>
                    <span className="text-gray-400">{v.is_5g ? '5GHz' : '2.4GHz'}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-400">{String(v.encryp_way === 'none' ? 'open' : v.encryp_way)}</span>
                    <span className="ml-auto">{String(v.staCount)} client</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── get_status (semplice) ───────────────────────────────────────────
  if (cmd.action === 'get_status') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricBox icon={Server} label="wifidog" value={r.wifidog ? '✅ running' : '❌ down'} color={r.wifidog ? 'green' : 'red'} />
        <MetricBox icon={Server} label="stunnel" value={r.stunnel ? '✅ running' : '❌ down'} color={r.stunnel ? 'green' : 'red'} />
        <MetricBox icon={Wifi} label="AP count" value={String(r.apCount ?? 0)} />
        <MetricBox icon={Globe} label="stunnel IP" value={<span className="font-mono text-xs">{String(r.stunnel_ip || '—')}</span>} />
        <MetricBox icon={Clock} label="Uptime (s)" value={String(r.uptimeSec ?? 0)} />
      </div>
    )
  }

  // ─── list_guest_users (MAC whitelist) ────────────────────────────────
  if (cmd.action === 'list_guest_users') {
    const macs = String(r.trusted_macs || '').split(/\s+/).filter(m => m.includes(':'))
    return (
      <div>
        <p className="text-xs text-gray-400 mb-2">{macs.length} MAC trusted</p>
        <div className="space-y-1">
          {macs.map((m, i) => (
            <div key={i} className="font-mono text-xs bg-gray-50 dark:bg-slate-800/50 rounded px-2 py-1">{m}</div>
          ))}
        </div>
      </div>
    )
  }

  // ─── reapply_firewall ────────────────────────────────────────────────
  if (cmd.action === 'reapply_firewall') {
    return (
      <div className="space-y-2">
        <MetricBox icon={Server} label="Vercel IPs in AuthWhite" value={String(r.vercelIpsInAuthWhite ?? 0)} color={Number(r.vercelIpsInAuthWhite) >= 4 ? 'green' : 'yellow'} />
        {r.output ? <LogBlock title="output" content={String(r.output)} /> : null}
      </div>
    )
  }

  // ─── default: JSON pretty ────────────────────────────────────────────
  return (
    <pre className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(r, null, 2)}
    </pre>
  )
}

export default function WifiDeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const [device, setDevice]   = useState<Device | null>(null)
  const [commands, setCommands] = useState<Command[]>([])
  const [action, setAction]   = useState('ping')
  const [mac, setMac]         = useState('')
  const [sending, startSend]  = useTransition()
  const [msg, setMsg]         = useState<string | null>(null)
  const [viewingCmd, setViewingCmd] = useState<Command | null>(null)

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
                const hasResult = c.result || c.errorMsg
                return (
                  <tr
                    key={c.id}
                    onClick={() => hasResult && setViewingCmd(c)}
                    className={`border-b border-gray-50 dark:border-slate-800 ${hasResult ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50' : ''}`}
                  >
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
                          ? (
                              <div className="flex items-center gap-2">
                                <Eye className="w-3 h-3 text-brand-500 flex-shrink-0" />
                                <span className="truncate">{JSON.stringify(c.result).slice(0, 80)}…</span>
                              </div>
                            )
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

      {/* Modal dettaglio risultato comando */}
      <Modal
        open={viewingCmd !== null}
        onClose={() => setViewingCmd(null)}
        title={viewingCmd ? `Dettaglio: ${viewingCmd.action}` : ''}
        size="lg"
      >
        {viewingCmd && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pb-3 border-b border-gray-100 dark:border-slate-700">
              <span className="font-mono">id: {viewingCmd.id.slice(-12)}</span>
              <span>·</span>
              <span>creato: {formatDate(viewingCmd.createdAt)}</span>
              {viewingCmd.sentAt && (
                <>
                  <span>·</span>
                  <span>inviato: {formatDate(viewingCmd.sentAt)}</span>
                </>
              )}
              {viewingCmd.doneAt && (
                <>
                  <span>·</span>
                  <span>completato: {formatDate(viewingCmd.doneAt)}</span>
                </>
              )}
            </div>
            <CommandResultView cmd={viewingCmd} />
          </div>
        )}
      </Modal>
    </div>
  )
}
