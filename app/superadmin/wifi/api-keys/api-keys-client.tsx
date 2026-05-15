'use client'

import { useEffect, useState } from 'react'

interface Host {
  id: string
  nomeAzienda: string
}

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  rateLimitPerMin: number
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  note: string | null
  createdAt: string
  host: { id: string; nomeAzienda: string }
}

const ALL_SCOPES = [
  { id: 'codes:read', label: 'Codici (lettura)' },
  { id: 'codes:write', label: 'Codici (scrittura/revoca)' },
  { id: 'sessions:read', label: 'Sessioni (lettura)' },
  { id: 'sessions:write', label: 'Sessioni (revoca)' },
  { id: 'devices:read', label: 'Device (lettura stato)' },
  { id: 'bookings:write', label: 'Prenotazioni (push)' },
]

export default function ApiKeysClient({ hosts }: { hosts: Host[] }) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<{ plain: string; meta: ApiKey } | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/superadmin/wifi/api-keys')
      const data = await res.json()
      setKeys(data.keys ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function revoke(id: string) {
    if (!confirm('Revocare questa API key? Le integrazioni esterne smetteranno di funzionare immediatamente.')) return
    const res = await fetch(`/api/superadmin/wifi/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) await load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">API Keys Wi-Fi</h1>
            <p className="text-sm text-gray-500">Chiavi pubbliche per integrazioni esterne (PMS terzi, Zapier, ecc.)</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            + Crea API key
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Caricamento…</div>
        ) : keys.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">🔑</div>
            <h2 className="text-lg font-medium mb-2">Nessuna API key</h2>
            <p className="text-sm text-gray-500 mb-4">Genera la prima key per permettere integrazioni esterne.</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
              + Crea API key
            </button>
          </div>
        ) : (
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500 border-b">
                <tr>
                  <th className="py-2 px-3">Nome</th>
                  <th className="py-2 px-3">Host</th>
                  <th className="py-2 px-3">Prefix</th>
                  <th className="py-2 px-3">Scopes</th>
                  <th className="py-2 px-3">Rate</th>
                  <th className="py-2 px-3">Ultimo uso</th>
                  <th className="py-2 px-3">Stato</th>
                  <th className="py-2 px-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => {
                  const revoked = !!k.revokedAt
                  const expired = k.expiresAt && new Date(k.expiresAt) < new Date()
                  return (
                    <tr key={k.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="font-medium">{k.name}</div>
                        {k.note && <div className="text-xs text-gray-500">{k.note}</div>}
                      </td>
                      <td className="py-2 px-3 text-xs">{k.host.nomeAzienda}</td>
                      <td className="py-2 px-3 font-mono text-xs">{k.keyPrefix}…</td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {k.scopes.map(s => <span key={s} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">{s}</span>)}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs">{k.rateLimitPerMin}/min</td>
                      <td className="py-2 px-3 text-xs">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', hour: '2-digit', minute: '2-digit' }) : 'mai'}</td>
                      <td className="py-2 px-3">
                        {revoked
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">revocata</span>
                          : expired
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">scaduta</span>
                            : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">attiva</span>}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {!revoked && !expired && (
                          <button onClick={() => revoke(k.id)} className="text-red-500 hover:text-red-700 text-xs">Revoca</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateKeyModal hosts={hosts} onClose={() => setShowCreate(false)} onCreated={(k, plain) => { setShowCreate(false); setNewKey({ plain, meta: k }); load() }} />}
      {newKey && <ShowKeyModal data={newKey} onClose={() => setNewKey(null)} />}
    </div>
  )
}

function CreateKeyModal({ hosts, onClose, onCreated }: { hosts: Host[]; onClose: () => void; onCreated: (k: ApiKey, plain: string) => void }) {
  const [hostId, setHostId] = useState('')
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['codes:read', 'codes:write'])
  const [rateLimitPerMin, setRateLimitPerMin] = useState(60)
  const [expiresAt, setExpiresAt] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggleScope(s: string) {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setErr(null)
    try {
      const res = await fetch('/api/superadmin/wifi/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId, name, scopes, rateLimitPerMin,
          expiresAt: expiresAt || null,
          note: note || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'errore'); return }
      onCreated(data.key, data.plainKey)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Crea nuova API key</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Host *</label>
            <select required value={hostId} onChange={e => setHostId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">— seleziona host —</option>
              {hosts.map(h => <option key={h.id} value={h.id}>{h.nomeAzienda}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Nome integrazione *</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="es. Hotelfriend, Zapier prenotazioni" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Permessi (scopes) *</label>
            <div className="space-y-1.5 border rounded-lg p-3 bg-gray-50">
              {ALL_SCOPES.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={scopes.includes(s.id)} onChange={() => toggleScope(s.id)} />
                  <span className="font-mono text-xs">{s.id}</span>
                  <span className="text-gray-500 text-xs">— {s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Rate limit (req/min)</label>
              <input type="number" min={1} max={1000} value={rateLimitPerMin} onChange={e => setRateLimitPerMin(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Scadenza (opzionale)</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Nota (opzionale)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Contesto integrazione, contatto, ecc." className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">⚠ {err}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm">Annulla</button>
            <button type="submit" disabled={submitting || scopes.length === 0} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {submitting ? 'Creazione…' : 'Crea API key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ShowKeyModal({ data, onClose }: { data: { plain: string; meta: ApiKey }; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(data.plain); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch {}
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <h2 className="text-lg font-semibold mb-1">✓ API key creata</h2>
        <p className="text-sm text-gray-500 mb-4">{data.meta.name} → {data.meta.host.nomeAzienda}</p>

        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
          <p className="text-xs uppercase tracking-wide text-yellow-800 font-semibold mb-2">⚠ Copia ora — non sarà più visibile</p>
          <code className="block bg-white px-3 py-2 rounded font-mono text-xs break-all border border-yellow-200 mb-2">{data.plain}</code>
          <button onClick={copy} className="text-xs bg-yellow-200 hover:bg-yellow-300 px-3 py-1 rounded font-medium">
            {copied ? '✓ Copiato!' : '📋 Copia chiave'}
          </button>
        </div>

        <div className="bg-gray-50 border rounded-lg p-3 text-xs font-mono space-y-1 mb-4">
          <div><strong>Endpoint base:</strong> {typeof window !== 'undefined' ? window.location.origin : ''}/api/public/wifi</div>
          <div><strong>Header auth:</strong> Authorization: ApiKey {data.plain.slice(0, 12)}…</div>
        </div>

        <div className="text-xs text-gray-600 space-y-1 mb-4">
          <p><strong>Esempio cURL:</strong></p>
          <pre className="bg-gray-900 text-green-300 p-2 rounded text-[11px] overflow-x-auto">{`curl -H "Authorization: ApiKey ${data.plain}" \\
  ${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/wifi/codes`}</pre>
        </div>

        <button onClick={onClose} className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
          Ho salvato la key, chiudi
        </button>
      </div>
    </div>
  )
}
