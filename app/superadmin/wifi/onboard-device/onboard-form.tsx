'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'

type Host = {
  id: string
  nomeAzienda: string
  strutture: { id: string; nome: string }[]
}

type ResultOk = {
  ok: true
  deviceId: string
  mac: string
  token: string
  filename: string
  fileUrl: string
  fileSize: number
}
type ResultErr = { ok: false; error: string }

export default function OnboardDeviceForm({ hosts }: { hosts: Host[] }) {
  const [hostId, setHostId] = useState('')
  const [strutturaId, setStrutturaId] = useState('')
  const [alias, setAlias] = useState('')
  const [modello, setModello] = useState('CF-AC101')
  const [mac, setMac] = useState('')
  const [sshPubkey, setSshPubkey] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultOk | ResultErr | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)

  function closeSuccess() {
    if (result?.ok) URL.revokeObjectURL(result.fileUrl)
    setResult(null)
    setTokenCopied(false)
  }

  async function copyToken() {
    if (!result?.ok) return
    try {
      await navigator.clipboard.writeText(result.token)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2500)
    } catch {
      // fallback: select the element text
    }
  }

  const selectedHost = hosts.find(h => h.id === hostId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setResult({ ok: false, error: 'Carica prima il file backup' })
      return
    }
    setLoading(true); setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('hostId', hostId)
      fd.append('alias', alias)
      fd.append('modello', modello)
      if (mac.trim()) fd.append('mac', mac)
      if (strutturaId) fd.append('strutturaId', strutturaId)
      if (sshPubkey.trim()) fd.append('sshPubkey', sshPubkey)
      if (note.trim()) fd.append('note', note)

      const res = await fetch('/api/superadmin/wifi/onboard-device', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore sconosciuto' }))
        setResult({ ok: false, error: data.error || `HTTP ${res.status}` })
        return
      }

      const deviceId = res.headers.get('X-Otium-Device-Id') || ''
      const macHdr = res.headers.get('X-Otium-Mac') || ''
      const token = res.headers.get('X-Otium-Token') || ''
      const cd = res.headers.get('Content-Disposition') || ''
      const fnMatch = cd.match(/filename="([^"]+)"/)
      const filename = fnMatch ? fnMatch[1] : 'otium-backup.file'

      const blob = await res.blob()
      const fileUrl = URL.createObjectURL(blob)
      setResult({ ok: true, deviceId, mac: macHdr, token, filename, fileUrl, fileSize: blob.size })
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Errore di rete' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4 bg-white border rounded-lg p-6">
        {/* Host */}
        <div>
          <label className="block text-sm font-medium mb-1">Host destinatario *</label>
          <select
            required
            value={hostId}
            onChange={e => { setHostId(e.target.value); setStrutturaId('') }}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">— seleziona host —</option>
            {hosts.map(h => <option key={h.id} value={h.id}>{h.nomeAzienda}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1">Solo host con modulo Wi-Fi attivo</p>
        </div>

        {/* Struttura (opzionale) */}
        {selectedHost && selectedHost.strutture.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Struttura <span className="text-gray-400 font-normal">(opzionale)</span></label>
            <select
              value={strutturaId}
              onChange={e => setStrutturaId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">— tutte le strutture dell&apos;host —</option>
              {selectedHost.strutture.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        )}

        {/* Alias */}
        <div>
          <label className="block text-sm font-medium mb-1">Alias device *</label>
          <input
            type="text"
            required
            value={alias}
            onChange={e => setAlias(e.target.value)}
            placeholder="es. Reception Mastroberardino"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {/* Modello */}
        <div>
          <label className="block text-sm font-medium mb-1">Modello *</label>
          <select
            value={modello}
            onChange={e => setModello(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="CF-AC101">CF-AC101 (Wireless controller)</option>
            <option value="CF-AC300">CF-AC300 (Wireless controller pro)</option>
            <option value="CF-E385AC">CF-E385AC (AP)</option>
            <option value="CF-E375AC">CF-E375AC (AP)</option>
            <option value="CF-E560V2">CF-E560V2 (AP)</option>
          </select>
        </div>

        {/* MAC (opzionale) */}
        <div>
          <label className="block text-sm font-medium mb-1">MAC LAN <span className="text-gray-400 font-normal">(opzionale)</span></label>
          <input
            type="text"
            value={mac}
            onChange={e => setMac(e.target.value)}
            placeholder="es. E0:E1:A9:0E:2D:CF — lascia vuoto se ignoto"
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Se vuoto, l&apos;agent auto-rileva al primo boot dal br-lan</p>
        </div>

        {/* SSH pubkey */}
        <div>
          <label className="block text-sm font-medium mb-1">SSH public key <span className="text-gray-400 font-normal">(opzionale, fallback su env)</span></label>
          <textarea
            value={sshPubkey}
            onChange={e => setSshPubkey(e.target.value)}
            rows={3}
            placeholder="ssh-rsa AAAA... operator@otium"
            className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">Se vuoto, usa <code>OTIUM_SSH_PUBKEY</code> di env Vercel</p>
        </div>

        {/* Backup file */}
        <div>
          <label className="block text-sm font-medium mb-1">Factory backup .file *</label>
          <input
            type="file"
            required
            accept=".file,.bin,.gz,application/octet-stream"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {file && <p className="text-xs text-gray-500 mt-1">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium mb-1">Note <span className="text-gray-400 font-normal">(opzionale)</span></label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file || !hostId}
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Patching in corso…' : 'Crea device + scarica backup patchato'}
        </button>
      </form>

      {/* Errore inline */}
      {result && !result.ok && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          <strong>Errore:</strong> {result.error}
        </div>
      )}

      {/* Modal popup success */}
      <Modal
        open={!!(result && result.ok)}
        onClose={closeSuccess}
        title="✓ Device creato"
        size="lg"
        footer={
          <button
            type="button"
            onClick={closeSuccess}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
          >
            Ho salvato tutto, chiudi
          </button>
        }
      >
        {result && result.ok && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              Backup patchato pronto. Salva il bearer token <strong>prima</strong> di chiudere — non sarà più visibile.
            </p>

            {/* Download */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-700 mb-2 font-semibold">Step 1 — Download file patchato</p>
              <a
                href={result.fileUrl}
                download={result.filename}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 text-sm"
              >
                ⬇ Scarica {result.filename}
              </a>
              <p className="text-xs text-gray-500 mt-2">{(result.fileSize / 1024).toFixed(1)} KB</p>
            </div>

            {/* Token */}
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs uppercase tracking-wide text-yellow-800 font-semibold">⚠ Step 2 — Salva il Bearer Token</p>
                <button
                  type="button"
                  onClick={copyToken}
                  className="text-xs bg-yellow-200 hover:bg-yellow-300 px-2 py-1 rounded font-medium"
                >
                  {tokenCopied ? '✓ Copiato!' : '📋 Copia'}
                </button>
              </div>
              <code className="block bg-white px-3 py-2 rounded font-mono text-xs break-all border border-yellow-200">
                {result.token}
              </code>
              <p className="text-xs text-gray-600 mt-2">Questa è l&apos;unica volta che vedi il token in chiaro. Conservalo (es. in un password manager o nella scheda cliente).</p>
            </div>

            {/* Meta */}
            <div className="bg-gray-50 border rounded-lg p-3 text-xs space-y-1">
              <div><strong>Device ID:</strong> <code className="bg-white px-1 rounded">{result.deviceId}</code></div>
              <div><strong>MAC:</strong> <code className="bg-white px-1 rounded">{result.mac}</code></div>
            </div>

            {/* Prossimi passi */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-blue-900 mb-2">Prossimi passi:</p>
              <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                <li>Carica il file su Web UI router → <strong>Manage Config → Restore</strong></li>
                <li>Aspetta riavvio (~60s)</li>
                <li>Verifica heartbeat su <a href="/superadmin/wifi" className="text-indigo-600 underline">Wi-Fi devices</a></li>
                <li>Per setup completo local-first portal lancia <code className="bg-white px-1 rounded">deploy-from-pc.sh</code> da PC operatore</li>
              </ol>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
