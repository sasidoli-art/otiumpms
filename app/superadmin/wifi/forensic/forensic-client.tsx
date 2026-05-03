'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Search, FileText, Download, ArrowLeft, AlertCircle, Loader2, Shield,
} from 'lucide-react'

type Host = {
  id: string
  nomeAzienda: string
  strutture: { id: string; nome: string }[]
}

type ForensicResult = {
  sessionId: string
  tipoLogin: string
  hostNome: string
  strutturaNome: string | null
  numeroCamera: string | null
  guestNome: string
  guestCognome: string | null
  guestEmail: string | null
  guestTipoDocumento: string | null
  guestNumeroDocumento: string | null
  macClient: string | null
  ipClient: string | null
  sessionStart: string
  sessionExpire: string
  sessionRevoked: string | null
}

interface Filters {
  hostId: string
  strutturaId: string
  dataInizio: string
  dataFine: string
  macClient: string
  ipClient: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  tipo: string
}

const TIPI = ['', 'PRENOTAZIONE', 'CODICE', 'COMPLIMENTARY', 'USER_FORM', 'EMAIL_ONLY']

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function ForensicClient({ hosts }: { hosts: Host[] }) {
  const [filters, setFilters] = useState<Filters>({
    hostId: '',
    strutturaId: '',
    dataInizio: '',
    dataFine: '',
    macClient: '',
    ipClient: '',
    guestNome: '',
    guestCognome: '',
    guestEmail: '',
    tipo: '',
  })

  const selectedHost = useMemo(
    () => hosts.find(h => h.id === filters.hostId),
    [hosts, filters.hostId],
  )

  const [searching, setSearching] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ForensicResult[] | null>(null)
  const [truncated, setTruncated] = useState(false)

  // Protocol metadata per export
  const [protocolNumber, setProtocolNumber] = useState('')
  const [protocolDate, setProtocolDate] = useState('')
  const [requestingAuthority, setRequestingAuthority] = useState('')
  const [caseReference, setCaseReference] = useState('')

  function buildPayload() {
    const out: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(filters)) {
      if (typeof v === 'string' && v.trim()) {
        // dataInizio/dataFine arrivano come "2026-05-03" → converti a ISO
        if (k === 'dataInizio') out[k] = new Date(v + 'T00:00:00').toISOString()
        else if (k === 'dataFine') out[k] = new Date(v + 'T23:59:59').toISOString()
        else out[k] = v.trim()
      }
    }
    return out
  }

  async function search(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResults(null)
    setSearching(true)
    try {
      const res = await fetch('/api/superadmin/wifi/forensic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setResults(json.results)
      setTruncated(Boolean(json.truncated))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSearching(false)
    }
  }

  async function exportFile(format: 'pdf' | 'csv') {
    if (!results) return
    setExporting(format)
    setError(null)
    try {
      const body = {
        filters: buildPayload(),
        format,
        ...(protocolNumber && { protocolNumber }),
        ...(protocolDate && { protocolDate: new Date(protocolDate + 'T00:00:00').toISOString() }),
        ...(requestingAuthority && { requestingAuthority }),
        ...(caseReference && { caseReference }),
      }
      const res = await fetch('/api/superadmin/wifi/forensic/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Export failed: ${text.slice(0, 200)}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition') ?? ''
      const fname = /filename="([^"]+)"/.exec(cd)?.[1] ?? `forensic-export.${format}`
      a.download = fname
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const sha = res.headers.get('X-Otium-Forensic-Sha256')
      if (format === 'pdf' && sha) {
        // Persist hash visibile per chain of custody
        alert(`Export PDF completato.\n\nSHA-256:\n${sha}\n\nSalva questo hash insieme al file. Verifica con:\ncertutil -hashfile "${fname}" SHA256`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export errore')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Link href="/superadmin/wifi" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Wi-Fi Fleet
      </Link>

      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-600" />
          Report Forense Wi-Fi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estrazione log accessi per richieste autorità (Polizia Postale, magistratura).
          Conformità D.L. 144/2005 + art. 254-bis CPP.
        </p>
      </div>

      <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 flex gap-2">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Attenzione</strong>: ogni ricerca/esportazione viene tracciata in audit log
          (chain of custody). Usa solo per richieste documentate. I dati sono conservati 12 mesi
          dal momento della sessione.
        </div>
      </div>

      {/* Form filtri */}
      <form onSubmit={search} className="rounded-lg border p-6 space-y-4">
        <h2 className="text-base font-semibold">Filtri ricerca</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
              Host (azienda cliente)
            </label>
            <select
              value={filters.hostId}
              onChange={(e) => setFilters({ ...filters, hostId: e.target.value, strutturaId: '' })}
              className="w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="">Tutti</option>
              {hosts.map(h => <option key={h.id} value={h.id}>{h.nomeAzienda}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
              Struttura
            </label>
            <select
              value={filters.strutturaId}
              onChange={(e) => setFilters({ ...filters, strutturaId: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background"
              disabled={!selectedHost}
            >
              <option value="">Tutte</option>
              {selectedHost?.strutture.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
              Data inizio (≥)
            </label>
            <input
              type="date"
              value={filters.dataInizio}
              onChange={(e) => setFilters({ ...filters, dataInizio: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
              Data fine (≤)
            </label>
            <input
              type="date"
              value={filters.dataFine}
              onChange={(e) => setFilters({ ...filters, dataFine: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
              MAC client
            </label>
            <input
              type="text"
              value={filters.macClient}
              onChange={(e) => setFilters({ ...filters, macClient: e.target.value })}
              placeholder="aa:bb:cc:dd:ee:ff"
              className="w-full px-3 py-2 rounded-md border bg-background font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
              IP client
            </label>
            <input
              type="text"
              value={filters.ipClient}
              onChange={(e) => setFilters({ ...filters, ipClient: e.target.value })}
              placeholder="172.20.0.105"
              className="w-full px-3 py-2 rounded-md border bg-background font-mono text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
              Nome ospite
            </label>
            <input
              type="text"
              value={filters.guestNome}
              onChange={(e) => setFilters({ ...filters, guestNome: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
              Cognome ospite
            </label>
            <input
              type="text"
              value={filters.guestCognome}
              onChange={(e) => setFilters({ ...filters, guestCognome: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
              Email ospite
            </label>
            <input
              type="email"
              value={filters.guestEmail}
              onChange={(e) => setFilters({ ...filters, guestEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
            Tipo login
          </label>
          <select
            value={filters.tipo}
            onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
            className="w-full px-3 py-2 rounded-md border bg-background"
          >
            {TIPI.map(t => (
              <option key={t} value={t}>{t || '— Qualsiasi —'}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={searching}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Cerca sessioni
        </button>
      </form>

      {/* Risultati */}
      {results !== null && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                {results.length} sessioni trovate{truncated && ' (truncated, max 200 — affina i filtri)'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Ordinate per data inizio (più recenti prima).
              </p>
            </div>
          </div>

          {results.length > 0 && (
            <>
              {/* Metadata richiesta autorità (per export) */}
              <details className="rounded-lg border p-4 group">
                <summary className="cursor-pointer text-sm font-medium select-none">
                  Metadata richiesta autorità (opzionale, per intestazione PDF)
                </summary>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
                      Numero protocollo
                    </label>
                    <input
                      type="text"
                      value={protocolNumber}
                      onChange={(e) => setProtocolNumber(e.target.value)}
                      placeholder="es. Prot. 1234/2026"
                      className="w-full px-3 py-2 rounded-md border bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
                      Data protocollo
                    </label>
                    <input
                      type="date"
                      value={protocolDate}
                      onChange={(e) => setProtocolDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
                      Autorità richiedente
                    </label>
                    <input
                      type="text"
                      value={requestingAuthority}
                      onChange={(e) => setRequestingAuthority(e.target.value)}
                      placeholder="es. Polizia Postale di Milano"
                      className="w-full px-3 py-2 rounded-md border bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">
                      Riferimento procedimento
                    </label>
                    <input
                      type="text"
                      value={caseReference}
                      onChange={(e) => setCaseReference(e.target.value)}
                      placeholder="es. Proc. Pen. 567/2026 R.G.N.R."
                      className="w-full px-3 py-2 rounded-md border bg-background"
                    />
                  </div>
                </div>
              </details>

              {/* Export buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => exportFile('pdf')}
                  disabled={Boolean(exporting)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Export PDF firmato (SHA-256)
                </button>
                <button
                  onClick={() => exportFile('csv')}
                  disabled={Boolean(exporting)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-accent font-medium disabled:opacity-50"
                >
                  {exporting === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Export CSV
                </button>
              </div>

              {/* Tabella anteprima */}
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-medium uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Inizio</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Host / Struttura</th>
                      <th className="px-3 py-2 text-left">Camera</th>
                      <th className="px-3 py-2 text-left">Ospite</th>
                      <th className="px-3 py-2 text-left">MAC</th>
                      <th className="px-3 py-2 text-left">IP</th>
                      <th className="px-3 py-2 text-left">Documento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.map(r => (
                      <tr key={r.sessionId} className="hover:bg-muted/20">
                        <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDateTime(r.sessionStart)}</td>
                        <td className="px-3 py-2 text-xs">{r.tipoLogin}</td>
                        <td className="px-3 py-2 text-xs">
                          <div>{r.hostNome}</div>
                          {r.strutturaNome && <div className="text-muted-foreground">{r.strutturaNome}</div>}
                        </td>
                        <td className="px-3 py-2 text-xs">{r.numeroCamera ?? '—'}</td>
                        <td className="px-3 py-2 text-xs">
                          <div>{r.guestNome}{r.guestCognome ? ` ${r.guestCognome}` : ''}</div>
                          {r.guestEmail && <div className="text-muted-foreground">{r.guestEmail}</div>}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono">{r.macClient ?? '—'}</td>
                        <td className="px-3 py-2 text-xs font-mono">{r.ipClient ?? '—'}</td>
                        <td className="px-3 py-2 text-xs">
                          {r.guestTipoDocumento && r.guestNumeroDocumento
                            ? `${r.guestTipoDocumento} ${r.guestNumeroDocumento}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
