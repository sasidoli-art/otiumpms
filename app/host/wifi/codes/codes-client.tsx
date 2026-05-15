'use client'

import { useEffect, useState, useMemo } from 'react'

interface CodeRow {
  id: string
  codice: string
  durataMinuti: number
  usiMax: number
  usiEffettuati: number
  validoFino: string | null
  revocatoAt: string | null
  note: string | null
  createdAt: string
}

type Filter = 'all' | 'active' | 'expired' | 'revoked'

export default function CodesClient({ hostNome }: { hostNome: string }) {
  const [codes, setCodes] = useState<CodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [selectedForPrint, setSelectedForPrint] = useState<CodeRow[]>([])

  async function load() {
    try {
      const res = await fetch('/api/host/wifi/access-codes', { cache: 'no-store' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'errore' }))
        setErr(d.error || `HTTP ${res.status}`)
        return
      }
      const json = await res.json()
      setCodes(json.codes ?? [])
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'errore')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  function statusOf(c: CodeRow): 'active' | 'expired' | 'revoked' | 'used-up' {
    if (c.revocatoAt) return 'revoked'
    if (c.validoFino && new Date(c.validoFino) < new Date()) return 'expired'
    if (c.usiMax >= 0 && c.usiEffettuati >= c.usiMax) return 'used-up'
    return 'active'
  }

  const filtered = useMemo(() => {
    const s = search.trim().toUpperCase()
    return codes.filter(c => {
      const status = statusOf(c)
      if (filter === 'active' && status !== 'active') return false
      if (filter === 'expired' && status !== 'expired' && status !== 'used-up') return false
      if (filter === 'revoked' && status !== 'revoked') return false
      if (s && !c.codice.includes(s) && !(c.note ?? '').toUpperCase().includes(s)) return false
      return true
    })
  }, [codes, filter, search])

  async function revoke(id: string) {
    if (!confirm('Revocare questo codice? L\'azione non è reversibile.')) return
    const res = await fetch(`/api/host/wifi/access-codes/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({ error: 'errore' }))
      alert(`Errore: ${d.error}`)
      return
    }
    await load()
  }

  function copyCode(c: string) {
    navigator.clipboard.writeText(c).catch(() => {})
  }

  function printSelected(rows: CodeRow[]) {
    setSelectedForPrint(rows)
    setShowPrint(true)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Caricamento…</div>
  if (err) return <div className="p-8 text-center text-red-600">Errore: {err}</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Codici Wi-Fi</h1>
            <p className="text-sm text-gray-500">{hostNome}</p>
          </div>
          <div className="flex gap-2">
            {filtered.length > 0 && (
              <button onClick={() => printSelected(filtered)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
                🖨 Stampa visibili ({filtered.length})
              </button>
            )}
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              + Genera codici
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Filtri */}
        <div className="bg-white border rounded-xl p-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {[
              { id: 'active' as const, label: 'Attivi' },
              { id: 'expired' as const, label: 'Scaduti/Esauriti' },
              { id: 'revoked' as const, label: 'Revocati' },
              { id: 'all' as const, label: 'Tutti' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id)}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  filter === opt.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca codice o nota…"
            className="flex-1 px-3 py-1.5 border rounded-lg text-sm min-w-[200px]"
          />
          <div className="text-xs text-gray-500">{filtered.length} di {codes.length}</div>
        </div>

        {/* Tabella */}
        <div className="bg-white border rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Nessun codice {filter !== 'all' ? `(filtro: ${filter})` : ''}.
              {codes.length === 0 && <div className="mt-2"><button onClick={() => setShowCreate(true)} className="text-indigo-600 underline">Genera il primo</button></div>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-gray-500 border-b bg-gray-50">
                  <tr>
                    <th className="py-2 px-3">Codice</th>
                    <th className="py-2 px-3">Durata</th>
                    <th className="py-2 px-3">Uso</th>
                    <th className="py-2 px-3">Scadenza</th>
                    <th className="py-2 px-3">Note</th>
                    <th className="py-2 px-3">Stato</th>
                    <th className="py-2 px-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const status = statusOf(c)
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <button onClick={() => copyCode(c.codice)} className="font-mono font-bold text-base hover:text-indigo-600" title="Copia">
                            {c.codice}
                          </button>
                        </td>
                        <td className="py-2 px-3 text-xs">{formatDuration(c.durataMinuti)}</td>
                        <td className="py-2 px-3 text-xs">
                          <span className="font-mono">{c.usiEffettuati}</span>
                          <span className="text-gray-400">/{c.usiMax === -1 ? '∞' : c.usiMax}</span>
                        </td>
                        <td className="py-2 px-3 text-xs">{c.validoFino ? formatDate(c.validoFino) : '—'}</td>
                        <td className="py-2 px-3 text-xs text-gray-600 truncate max-w-[200px]">{c.note ?? ''}</td>
                        <td className="py-2 px-3"><StatusBadge status={status} /></td>
                        <td className="py-2 px-3 text-right">
                          {status === 'active' && (
                            <button onClick={() => revoke(c.id)} className="text-red-500 hover:text-red-700 text-xs">Revoca</button>
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
      </div>

      {showCreate && <CreateCodeModal onClose={() => setShowCreate(false)} onCreated={async (created) => { setShowCreate(false); await load(); if (created.length > 0) printSelected(created) }} />}
      {showPrint && <PrintModal codes={selectedForPrint} hostNome={hostNome} onClose={() => setShowPrint(false)} />}
    </div>
  )
}

function StatusBadge({ status }: { status: 'active' | 'expired' | 'revoked' | 'used-up' }) {
  const config = {
    active:    { label: 'attivo',  bg: 'bg-green-100', text: 'text-green-700' },
    expired:   { label: 'scaduto', bg: 'bg-gray-100',  text: 'text-gray-600' },
    revoked:   { label: 'revocato', bg: 'bg-red-100',  text: 'text-red-700' },
    'used-up': { label: 'esaurito', bg: 'bg-orange-100', text: 'text-orange-700' },
  }[status]
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.text}`}>{config.label}</span>
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}g`
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ─── Modale crea codici ─────────────────────────────────────────────────

function CreateCodeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (codes: CodeRow[]) => void }) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [codiceCustom, setCodiceCustom] = useState('')
  const [count, setCount] = useState(10)
  const [prefix, setPrefix] = useState('')
  const [durataHours, setDurataHours] = useState(24)
  const [usiMax, setUsiMax] = useState<number | 'unlimited'>(1)
  const [validGiorni, setValidGiorni] = useState(30)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setErr(null)
    try {
      const body: Record<string, unknown> = {
        durataMinuti: durataHours * 60,
        usiMax: usiMax === 'unlimited' ? -1 : usiMax,
        validGiorni,
        note: note || undefined,
      }
      if (mode === 'single' && codiceCustom.trim()) body.codiceCustom = codiceCustom.trim()
      if (mode === 'bulk') {
        body.count = count
        if (prefix.trim()) body.prefix = prefix.trim()
      }
      const res = await fetch('/api/host/wifi/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || `HTTP ${res.status}`)
        return
      }
      onCreated(data.codes ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'errore')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-1">Genera codici Wi-Fi</h2>
        <p className="text-xs text-gray-500 mb-4">I codici saranno disponibili sul router entro 5 minuti.</p>

        {/* Mode toggle */}
        <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-4">
          <button type="button" onClick={() => setMode('single')} className={`px-3 py-1 text-xs rounded font-medium ${mode === 'single' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>
            Singolo
          </button>
          <button type="button" onClick={() => setMode('bulk')} className={`px-3 py-1 text-xs rounded font-medium ${mode === 'bulk' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>
            In blocco
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'single' ? (
            <div>
              <label className="block text-xs font-medium mb-1">Codice (opzionale, lascia vuoto per random)</label>
              <input type="text" value={codiceCustom} onChange={e => setCodiceCustom(e.target.value.toUpperCase())} placeholder="es. EVENT2026" maxLength={32} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
              <p className="text-xs text-gray-500 mt-1">3-32 caratteri, A-Z 0-9 e trattino</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Quanti codici? (1-100)</label>
                <input type="number" value={count} onChange={e => setCount(Math.max(1, Math.min(100, Number(e.target.value))))} min={1} max={100} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Prefix (opzionale)</label>
                <input type="text" value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} placeholder="es. SPA, EVENT" maxLength={16} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
                <p className="text-xs text-gray-500 mt-1">Es: prefix &quot;SPA&quot; → SPA-ABCDEF, SPA-XYZ123, …</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Durata sessione</label>
              <select value={durataHours} onChange={e => setDurataHours(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value={1}>1 ora</option>
                <option value={2}>2 ore</option>
                <option value={4}>4 ore</option>
                <option value={12}>12 ore</option>
                <option value={24}>24 ore</option>
                <option value={48}>2 giorni</option>
                <option value={168}>7 giorni</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Validità codice</label>
              <select value={validGiorni} onChange={e => setValidGiorni(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value={1}>1 giorno</option>
                <option value={7}>1 settimana</option>
                <option value={30}>30 giorni</option>
                <option value={90}>3 mesi</option>
                <option value={365}>1 anno</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Numero utilizzi</label>
            <div className="flex gap-2">
              <select value={usiMax === 'unlimited' ? 'unlimited' : String(usiMax)} onChange={e => setUsiMax(e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value))} className="flex-1 px-3 py-2 border rounded-lg text-sm">
                <option value="1">1 uso (monouso)</option>
                <option value="5">5 usi</option>
                <option value="10">10 usi</option>
                <option value="50">50 usi</option>
                <option value="unlimited">Illimitati</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Nota (opzionale)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="es. Evento 14/05, Spa weekend" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">⚠ {err}</div>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">
              Annulla
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'Generazione…' : mode === 'single' ? 'Genera codice' : `Genera ${count} codici`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modale stampa ──────────────────────────────────────────────────────

function PrintModal({ codes, hostNome, onClose }: { codes: CodeRow[]; hostNome: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 print:hidden" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Anteprima stampa — {codes.length} codici</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">🖨 Stampa</button>
            <button onClick={onClose} className="px-3 py-1.5 border rounded-lg text-sm">Chiudi</button>
          </div>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="print-area grid grid-cols-2 gap-3">
            {codes.map(c => (
              <div key={c.id} className="border-2 border-dashed border-gray-300 rounded-lg p-4 break-inside-avoid">
                <div className="text-xs text-gray-500 mb-1">{hostNome}</div>
                <div className="text-xs text-gray-500 mb-3">Wi-Fi gratuito ospiti</div>
                <div className="font-mono text-2xl font-bold text-center py-3 bg-gray-50 rounded-lg select-all">
                  {c.codice}
                </div>
                <div className="text-xs text-gray-500 mt-3 space-y-0.5">
                  <div>Durata: <strong>{formatDuration(c.durataMinuti)}</strong></div>
                  <div>Utilizzi: <strong>{c.usiMax === -1 ? 'Illimitati' : `${c.usiMax}`}</strong></div>
                  {c.validoFino && <div>Valido fino al: <strong>{formatDate(c.validoFino)}</strong></div>}
                  {c.note && <div className="italic">{c.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  )
}
