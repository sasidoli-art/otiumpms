'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Wifi, Download, Loader2, ArrowLeft, Copy, Check, AlertCircle } from 'lucide-react'

type Host = {
  id: string
  nomeAzienda: string
  strutture: { id: string; nome: string; citta: string | null }[]
}

const MODELLI = ['CF-AC50', 'CF-AC100', 'CF-AC101', 'CF-AC300'] as const

interface OnboardSuccessPayload {
  ok: true
  device: {
    id: string
    placeholderMac: string
    alias: string
    modello: string
    hostNome: string
    strutturaNome: string
  }
  config: {
    ssidGuest: string
    ssidStaff: string
    hostname: string
    apiUrlBase: string
    gatewayIp: string
    gatewaySubnet: string
  }
  apiToken: string
  apiTokenWarning: string
  staffWifiPassword: string
  backup: {
    filename: string
    size: number
    base64: string
  }
}

function generateRandomPassword(): string {
  const len = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  for (let i = 0; i < len; i++) out += charset[arr[i] % charset.length]
  return out
}

export default function OnboardClient({ hosts }: { hosts: Host[] }) {
  const [hostId, setHostId] = useState<string>(hosts[0]?.id ?? '')
  const selectedHost = useMemo(() => hosts.find(h => h.id === hostId), [hosts, hostId])
  const [strutturaId, setStrutturaId] = useState<string>(selectedHost?.strutture[0]?.id ?? '')

  const [modello, setModello] = useState<(typeof MODELLI)[number]>('CF-AC101')
  const [staffPassword, setStaffPassword] = useState<string>(() => generateRandomPassword())
  const [splashUrl, setSplashUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [ssidGuestOverride, setSsidGuestOverride] = useState('')
  const [ssidStaffOverride, setSsidStaffOverride] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OnboardSuccessPayload | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)

  // Quando cambia host, reset struttura
  function changeHost(id: string) {
    setHostId(id)
    const newHost = hosts.find(h => h.id === id)
    setStrutturaId(newHost?.strutture[0]?.id ?? '')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!strutturaId) {
      setError('Seleziona una struttura')
      return
    }
    if (staffPassword.length < 8) {
      setError('Password staff deve avere almeno 8 caratteri')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        strutturaId,
        modello,
        staffPassword,
      }
      if (alias.trim()) body.alias = alias.trim()
      if (splashUrl.trim()) body.splashUrl = splashUrl.trim()
      if (ssidGuestOverride.trim()) body.ssidGuestOverride = ssidGuestOverride.trim()
      if (ssidStaffOverride.trim()) body.ssidStaffOverride = ssidStaffOverride.trim()

      const res = await fetch('/api/superadmin/wifi/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Errore HTTP ${res.status}`)
      }
      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setSubmitting(false)
    }
  }

  function downloadBackup() {
    if (!result) return
    const bin = atob(result.backup.base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.backup.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function copyToken() {
    if (!result) return
    navigator.clipboard.writeText(result.apiToken)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  // ── Render: SUCCESS state ──────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Link href="/superadmin/wifi" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Wi-Fi Fleet
        </Link>

        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-full bg-green-100 p-2">
              <Wifi className="h-5 w-5 text-green-700" />
            </div>
            <h2 className="text-xl font-semibold text-green-900">Device pronto</h2>
          </div>
          <p className="text-sm text-green-800 mb-4">
            <strong>{result.device.alias}</strong> è stato registrato per{' '}
            <strong>{result.device.hostNome}</strong> → <strong>{result.device.strutturaNome}</strong>.
            Stato attuale: <code className="bg-white px-1.5 py-0.5 rounded">PENDING</code>.
            Diventerà <code className="bg-white px-1.5 py-0.5 rounded text-green-700">ONLINE</code> al primo heartbeat dopo la restore.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm bg-white rounded p-3 mb-4">
            <div>
              <div className="text-xs uppercase font-medium text-muted-foreground">SSID guest (open)</div>
              <div className="font-mono">{result.config.ssidGuest}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-medium text-muted-foreground">SSID staff (WPA2)</div>
              <div className="font-mono">{result.config.ssidStaff}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-medium text-muted-foreground">Hostname</div>
              <div className="font-mono">{result.config.hostname}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-medium text-muted-foreground">Gateway IP</div>
              <div className="font-mono">{result.config.gatewayIp}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs uppercase font-medium text-muted-foreground">Password staff Wi-Fi</div>
              <div className="font-mono break-all">{result.staffWifiPassword}</div>
            </div>
          </div>
        </div>

        {/* Step 1: scarica file */}
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-2">1️⃣ Scarica il backup patchato</h3>
          <p className="text-sm text-muted-foreground mb-4">
            File pronto da uploadare sul router factory-default via Web UI → Manage Config → Restore.
            Dimensione: {(result.backup.size / 1024).toFixed(1)} KB.
          </p>
          <button
            onClick={downloadBackup}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
          >
            <Download className="h-4 w-4" />
            Scarica {result.backup.filename}
          </button>
        </div>

        {/* Step 2: salva token */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-amber-900">2️⃣ Salva l&apos;API token (mostrato solo ora)</h3>
              <p className="text-sm text-amber-800 mt-1">
                Questo token serve per recovery / debug. Non viene mai più mostrato (in DB salvato solo l&apos;hash).
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 bg-white border rounded px-3 py-2 font-mono text-sm break-all">
              {result.apiToken}
            </code>
            <button
              onClick={copyToken}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm"
            >
              {copiedToken ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copiedToken ? 'Copiato' : 'Copia'}
            </button>
          </div>
        </div>

        {/* Step 3: istruzioni */}
        <div className="rounded-lg border p-6 text-sm space-y-3">
          <h3 className="text-lg font-semibold">3️⃣ Istruzioni per il tecnico/installatore</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Collega il nuovo router Comfast {result.device.modello} alla corrente</li>
            <li>Attaccaci un cavo di rete in una porta LAN, l&apos;altro capo nel PC</li>
            <li>Apri il browser su <code className="bg-muted px-1 py-0.5 rounded">http://192.168.10.1</code> (factory IP) o <code className="bg-muted px-1 py-0.5 rounded">http://172.16.0.1</code></li>
            <li>Login con <code className="bg-muted px-1 py-0.5 rounded">admin</code> / <code className="bg-muted px-1 py-0.5 rounded">admin</code></li>
            <li>Vai su <strong>System Tools → Manage Config → Restore</strong></li>
            <li>Seleziona il file <code className="bg-muted px-1 py-0.5 rounded">{result.backup.filename}</code> appena scaricato</li>
            <li>Clicca <strong>Upload &amp; Restore</strong>, conferma, attendi 60-90 secondi del reboot</li>
            <li>Quando torna su, il router avrà IP <code className="bg-muted px-1 py-0.5 rounded">{result.config.gatewayIp}</code> e SSID <code className="bg-muted px-1 py-0.5 rounded">{result.config.ssidGuest}</code> + <code className="bg-muted px-1 py-0.5 rounded">{result.config.ssidStaff}</code> attivi</li>
            <li>Collega il router alla rete del cliente (porta WAN al modem ISP) — agent fa heartbeat e in <Link href="/superadmin/wifi" className="text-indigo-600 hover:underline">/superadmin/wifi</Link> appare ONLINE entro 1 min</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setResult(null)
              setStaffPassword(generateRandomPassword())
            }}
            className="px-4 py-2 rounded-md border hover:bg-accent text-sm"
          >
            Crea altro device
          </button>
          <Link
            href="/superadmin/wifi"
            className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
          >
            Vai a Wi-Fi Fleet →
          </Link>
        </div>
      </div>
    )
  }

  // ── Render: FORM state ─────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/superadmin/wifi" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Wi-Fi Fleet
      </Link>

      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Wifi className="h-6 w-6 text-indigo-600" />
          Onboarding nuovo router
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Genera in 30 secondi il backup pre-configurato da uploadare su un router Comfast factory.
        </p>
      </div>

      {hosts.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
          Nessun host ha il modulo <code className="bg-white px-1 py-0.5 rounded">wifi</code> attivo. Attivalo prima dal pannello dei moduli.
        </div>
      )}

      <form onSubmit={submit} className="rounded-lg border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Host cliente *</label>
          <select
            value={hostId}
            onChange={(e) => changeHost(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background"
            required
          >
            {hosts.map(h => (
              <option key={h.id} value={h.id}>{h.nomeAzienda}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Struttura *</label>
          <select
            value={strutturaId}
            onChange={(e) => setStrutturaId(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background"
            required
            disabled={!selectedHost?.strutture.length}
          >
            {selectedHost?.strutture.length ? (
              selectedHost.strutture.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome}{s.citta ? ` — ${s.citta}` : ''}
                </option>
              ))
            ) : (
              <option value="">Nessuna struttura attiva</option>
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Modello router *</label>
            <select
              value={modello}
              onChange={(e) => setModello(e.target.value as (typeof MODELLI)[number])}
              className="w-full px-3 py-2 rounded-md border bg-background"
            >
              {MODELLI.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Alias (opzionale)</label>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Es. Reception ground floor"
              className="w-full px-3 py-2 rounded-md border bg-background"
              maxLength={100}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Password Wi-Fi staff (WPA2) *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border bg-background font-mono text-sm"
              minLength={8}
              maxLength={63}
              required
            />
            <button
              type="button"
              onClick={() => setStaffPassword(generateRandomPassword())}
              className="px-3 py-2 rounded-md border bg-background hover:bg-accent text-sm"
            >
              Genera
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            8-63 caratteri (standard WPA2). Visualizzata in chiaro al successo, salvata nelle note del device.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">URL post-login (splash redirect, opzionale)</label>
          <input
            type="url"
            value={splashUrl}
            onChange={(e) => setSplashUrl(e.target.value)}
            placeholder="https://www.struttura.it"
            className="w-full px-3 py-2 rounded-md border bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Dopo il login captive portal, l&apos;ospite verrà rediretto qui (sito struttura, app, ecc.).
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-indigo-600 hover:underline"
          >
            {showAdvanced ? '− Nascondi' : '+ Mostra'} opzioni avanzate
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-muted">
            <div>
              <label className="block text-sm font-medium mb-1.5">SSID guest (override)</label>
              <input
                type="text"
                value={ssidGuestOverride}
                onChange={(e) => setSsidGuestOverride(e.target.value)}
                placeholder="(default: nome struttura sanitizzato)"
                className="w-full px-3 py-2 rounded-md border bg-background"
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground mt-1">Default: derivato dal nome struttura. Es. &quot;Mastroberardino&quot;, &quot;Priamare&quot;</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">SSID staff (override)</label>
              <input
                type="text"
                value={ssidStaffOverride}
                onChange={(e) => setSsidStaffOverride(e.target.value)}
                placeholder="(default: <SSID guest>-Staff)"
                className="w-full px-3 py-2 rounded-md border bg-background"
                maxLength={32}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !strutturaId}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generazione in corso...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              Genera kit di onboarding
            </>
          )}
        </button>
      </form>
    </div>
  )
}
