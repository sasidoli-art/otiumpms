'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Shield, Search, Download, Trash2, Loader2, AlertTriangle,
  CheckCircle2, FileText, X, Clock, Play, RefreshCw,
} from 'lucide-react'

const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none'

export default function GdprManager() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [risultato, setRisultato] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [exportData, setExportData] = useState<object | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteResult, setDeleteResult] = useState<object | null>(null)

  async function handleExport() {
    if (!email.trim()) return
    setLoading(true); setErrore(null); setRisultato(null); setExportData(null)
    try {
      const res = await fetch(`/api/host/gdpr?email=${encodeURIComponent(email)}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore (${res.status})`)
      } else {
        const data = await res.json()
        setExportData(data)
        setRisultato(`Trovati ${data.prenotazioni?.length || 0} prenotazioni, ${data.profiloCrm?.length || 0} profili CRM, ${data.appuntamentiSpa?.length || 0} appuntamenti SPA`)
      }
    } catch { setErrore('Errore di rete') }
    setLoading(false)
  }

  function downloadJson() {
    if (!exportData) return
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gdpr_export_${email.replace('@', '_at_')}_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    setLoading(true); setErrore(null); setDeleteResult(null)
    try {
      const res = await fetch(`/api/host/gdpr?email=${encodeURIComponent(email)}&conferma=true`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore (${res.status})`)
      } else {
        const data = await res.json()
        setDeleteResult(data)
        setExportData(null)
      }
    } catch { setErrore('Errore di rete') }
    setLoading(false)
    setShowDeleteConfirm(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-500" /> GDPR & Privacy
          </h1>
          <p className="text-sm text-gray-500">Gestione dati personali ospiti — Regolamento UE 2016/679</p>
        </div>
      </div>

      {/* Info box */}
      <div className="card bg-blue-50 border-blue-200 space-y-2">
        <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Diritti dell'interessato
        </h3>
        <ul className="text-xs text-blue-800 space-y-1 ml-6 list-disc">
          <li><strong>Art. 15</strong> — Diritto di accesso: l'ospite ha diritto a ottenere copia dei suoi dati personali</li>
          <li><strong>Art. 17</strong> — Diritto all'oblio: l'ospite ha diritto alla cancellazione dei propri dati</li>
          <li><strong>Art. 20</strong> — Portabilit&agrave;: i dati vengono esportati in formato JSON leggibile</li>
        </ul>
        <p className="text-[10px] text-blue-600 mt-2">
          Nota: l'anonimizzazione non elimina i record contabili (obblighi fiscali art. 2220 c.c.) ma rimuove tutti i dati identificativi.
        </p>
      </div>

      {/* Ricerca ospite */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Cerca ospite per email</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setExportData(null); setDeleteResult(null); setRisultato(null); setErrore(null) }}
              placeholder="mario.rossi@email.com"
              className={`pl-9 ${inp}`}
            />
          </div>
          <button onClick={handleExport} disabled={loading || !email.trim()} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Cerca
          </button>
        </div>

        {errore && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {errore}
            <button onClick={() => setErrore(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {risultato && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {risultato}
          </div>
        )}
      </div>

      {/* Azioni */}
      {exportData && (
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Azioni disponibili</h3>

          {/* Export */}
          <button onClick={downloadJson} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-left">
            <Download className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Scarica dati (Art. 15 + Art. 20)</p>
              <p className="text-xs text-blue-600">Download JSON con tutti i dati personali dell'ospite</p>
            </div>
          </button>

          {/* Anonimizzazione */}
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left">
              <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900">Anonimizza dati (Art. 17 — Diritto all'oblio)</p>
                <p className="text-xs text-red-600">Rimuove tutti i dati identificativi. Azione irreversibile.</p>
              </div>
            </button>
          ) : (
            <div className="p-4 rounded-xl border-2 border-red-400 bg-red-50 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-900">Conferma anonimizzazione</p>
                  <p className="text-xs text-red-700 mt-1">
                    Tutti i dati personali di <strong>{email}</strong> saranno anonimizzati irreversibilmente:
                    nome, cognome, email, telefono, documento, note, messaggi chat, accompagnatori.
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    I record contabili (importi, date) saranno mantenuti per obblighi fiscali.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDelete} disabled={loading} className="btn-danger flex items-center gap-2 text-sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Conferma anonimizzazione
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary text-sm">Annulla</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risultato eliminazione */}
      {deleteResult && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-green-900">Anonimizzazione completata</h3>
          </div>
          <pre className="text-xs text-green-800 bg-green-100 rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(deleteResult, null, 2)}
          </pre>
        </div>
      )}
      {/* ═══ Sezione Retention Automatica ═══ */}
      <RetentionSection />
    </div>
  )
}

// ─── Retention Section ───────────────────────────────────────────────────────

type Policy = { id: string; label: string; description: string; retention: string; legalBasis: string; action: string }
type RetentionResult = { policy: string; processed: number; errors: number; details: string[] }

function RetentionSection() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<RetentionResult[] | null>(null)

  useEffect(() => {
    fetch('/api/host/gdpr/retention')
      .then(r => r.json())
      .then(d => setPolicies(d.policies ?? []))
      .catch(() => {})
  }, [])

  async function runRetention() {
    setRunning(true); setResults(null)
    try {
      const res = await fetch('/api/host/gdpr/retention', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results)
      }
    } catch (err) { console.error(err) }
    setRunning(false)
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-500" /> Policy di conservazione dati
        </h3>
        <button
          onClick={runRetention}
          disabled={running}
          className="btn-secondary flex items-center gap-2 text-xs"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Pulizia in corso...' : 'Esegui pulizia manuale'}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        La pulizia automatica viene eseguita ogni notte alle 03:00 dal cron job.
        Puoi anche eseguirla manualmente con il pulsante qui sopra.
      </p>

      {/* Policy table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-3 text-gray-500 font-semibold">Dato</th>
              <th className="text-left py-2 pr-3 text-gray-500 font-semibold">Conservazione</th>
              <th className="text-left py-2 pr-3 text-gray-500 font-semibold">Base giuridica</th>
              <th className="text-left py-2 text-gray-500 font-semibold">Azione</th>
            </tr>
          </thead>
          <tbody>
            {policies.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 pr-3">
                  <p className="font-medium text-gray-900">{p.label}</p>
                  <p className="text-gray-400 text-[10px]">{p.description}</p>
                </td>
                <td className="py-2.5 pr-3 text-gray-600">{p.retention}</td>
                <td className="py-2.5 pr-3 text-gray-500">{p.legalBasis}</td>
                <td className="py-2.5 text-gray-500">{p.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-sm font-semibold text-green-900">Pulizia completata</p>
          </div>
          {results.map(r => (
            <div key={r.policy} className="text-xs text-green-800">
              <span className="font-medium">{r.policy}</span>: {r.processed} record processati
              {r.errors > 0 && <span className="text-red-600"> ({r.errors} errori)</span>}
              {r.details.map((d, i) => (
                <p key={i} className="ml-4 text-green-600">→ {d}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
