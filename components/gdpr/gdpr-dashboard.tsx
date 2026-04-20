'use client'

import { useEffect, useState, useCallback } from 'react'
import { Shield, AlertTriangle, Loader2, Download, Check, X, RefreshCw } from 'lucide-react'

type Tab = 'richieste' | 'retention' | 'consensi' | 'art30'

type Richiesta = {
  id: string
  guestEmail: string
  guestNome: string
  motivo: string | null
  stato: 'PENDENTE' | 'IN_LAVORAZIONE' | 'COMPLETATA' | 'RIFIUTATA'
  motivoRifiuto: string | null
  datiCancellati: unknown
  richiestaAt: string
  scadenzaAt: string
  completataAt: string | null
}

type PolicyStatus = {
  id: string
  entita: string
  descrizione: string
  baseGiuridica: string
  riferimentoNormativo?: string
  giorniRetention: number
  azione: 'anonimizza' | 'cancella'
  recordInScadenza30gg: number
}

type ConsentOverview = {
  tipo: string
  label: string
  obbligatorio: boolean
  revocabile: boolean
  attivi: number
  revocati: number
  totale: number
  percOptIn: number | null
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}
function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function GdprDashboard() {
  const [tab, setTab] = useState<Tab>('richieste')

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">GDPR & Privacy</h1>
        </div>
        <p className="text-sm text-gray-500">
          Gestione richieste ospiti, retention dati, consensi e registro trattamenti Art. 30.
        </p>
      </header>

      <nav className="border-b border-gray-200 flex gap-6 overflow-x-auto">
        {([
          ['richieste', 'Richieste'],
          ['retention', 'Retention'],
          ['consensi', 'Consensi'],
          ['art30', 'Registro Art. 30'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'richieste' && <RichiesteTab />}
      {tab === 'retention' && <RetentionTab />}
      {tab === 'consensi' && <ConsensiTab />}
      {tab === 'art30' && <Art30Tab />}
    </div>
  )
}

// ─── TAB 1: RICHIESTE ────────────────────────────────────────────────────────

function RichiesteTab() {
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<{ type: 'esegui' | 'rifiuta'; r: Richiesta } | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [rifiutaMotivo, setRifiutaMotivo] = useState('obbligo_legale_conservazione')
  const [rifiutaDettagli, setRifiutaDettagli] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/host/gdpr/richieste')
      const data = await res.json()
      setRichieste(data.richieste ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function openEseguiDialog(r: Richiesta) {
    setDialog({ type: 'esegui', r })
    setPreview(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/host/gdpr/richieste/${r.id}/preview`)
      const data = await res.json()
      setPreview(data.preview)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function esegui() {
    if (!dialog) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/host/gdpr/richieste/${dialog.r.id}/esegui`, { method: 'POST' })
      if (res.ok) {
        setDialog(null)
        await load()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Errore')
      }
    } finally {
      setProcessing(false)
    }
  }

  async function rifiuta() {
    if (!dialog) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/host/gdpr/richieste/${dialog.r.id}/rifiuta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: rifiutaMotivo, dettagli: rifiutaDettagli }),
      })
      if (res.ok) {
        setDialog(null)
        setRifiutaDettagli('')
        await load()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Errore')
      }
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
  if (richieste.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Nessuna richiesta privacy pendente</p>
      </div>
    )
  }

  const scadute = richieste.filter(
    (r) => r.stato === 'PENDENTE' && daysUntil(r.scadenzaAt) < 0,
  )

  return (
    <div className="space-y-4">
      {scadute.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">
              ⚠ {scadute.length} richiest{scadute.length > 1 ? 'e' : 'a'} scadut{scadute.length > 1 ? 'e' : 'a'}
            </p>
            <p className="text-xs text-red-800 mt-1">
              Il GDPR (Art. 17) richiede risposta entro 30 giorni. Procedi con l&apos;esecuzione o il rifiuto motivato ora.
            </p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Ospite</th>
              <th className="px-4 py-3">Scadenza</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {richieste.map((r) => {
              const gg = daysUntil(r.scadenzaAt)
              const scaduta = gg < 0 && r.stato === 'PENDENTE'
              const scadenzaBadge = scaduta
                ? 'bg-red-100 text-red-700 border-red-200'
                : gg < 7
                  ? 'bg-red-50 text-red-700 border-red-100'
                  : gg < 15
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              const statoBadge = {
                PENDENTE: 'bg-amber-100 text-amber-800',
                IN_LAVORAZIONE: 'bg-blue-100 text-blue-800',
                COMPLETATA: 'bg-emerald-100 text-emerald-800',
                RIFIUTATA: 'bg-red-100 text-red-800',
              }[r.stato]
              return (
                <tr key={r.id} className={scaduta ? 'bg-red-50/50' : ''}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(r.richiestaAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.guestNome}</div>
                    <div className="text-xs text-gray-500">{r.guestEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${scadenzaBadge}`}>
                      {scaduta ? `Scaduta ${Math.abs(gg)}gg fa` : `${gg}gg (${formatDate(r.scadenzaAt)})`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statoBadge}`}>
                      {r.stato}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <a
                      href={`/api/host/gdpr/richieste/${r.id}/export`}
                      className="text-xs text-indigo-600 hover:underline font-medium mr-3"
                      title="Scarica pacchetto dati ospite (Art. 15)"
                    >
                      Scarica dati
                    </a>
                    {r.stato === 'PENDENTE' || r.stato === 'IN_LAVORAZIONE' ? (
                      <>
                        <button
                          onClick={() => openEseguiDialog(r)}
                          className="text-xs text-emerald-600 hover:underline font-medium mr-3"
                        >
                          Esegui
                        </button>
                        <button
                          onClick={() => setDialog({ type: 'rifiuta', r })}
                          className="text-xs text-red-600 hover:underline font-medium"
                        >
                          Rifiuta
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {r.completataAt ? formatDate(r.completataAt) : ''}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* DIALOG ESEGUI */}
      {dialog?.type === 'esegui' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900">Esegui cancellazione</h3>
            <p className="text-sm text-gray-500 mt-1">
              {dialog.r.guestNome} — {dialog.r.guestEmail}
            </p>
            {dialog.r.motivo && (
              <p className="text-xs text-gray-400 mt-2 italic">"{dialog.r.motivo}"</p>
            )}

            {previewLoading && (
              <div className="py-8 text-center text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            )}

            {!previewLoading && preview && (
              <div className="mt-4 space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-emerald-900 mb-2">Verranno cancellati/anonimizzati:</p>
                  <ul className="text-xs text-emerald-900 space-y-0.5">
                    {Object.entries((preview as { daCancellare: Record<string, unknown> }).daCancellare).map(([k, v]) => (
                      <li key={k}>• {k}: <strong>{String(v)}</strong></li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-900 mb-2">NON cancellabili (obbligo legale):</p>
                  <ul className="text-xs text-amber-900 space-y-0.5">
                    {Object.entries((preview as { conservatiPerLegge: Record<string, unknown> }).conservatiPerLegge).map(([k, v]) => (
                      <li key={k}>• {k}: <strong>{String(v)}</strong></li>
                    ))}
                    {(preview as { dataUltimaConservazioneAlloggiati: string | null }).dataUltimaConservazioneAlloggiati && (
                      <li className="mt-1 pt-1 border-t border-amber-200">
                        Conservazione dati Alloggiati fino al{' '}
                        <strong>
                          {formatDate((preview as { dataUltimaConservazioneAlloggiati: string | null }).dataUltimaConservazioneAlloggiati)}
                        </strong>{' '}
                        (Art. 109 TULPS)
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDialog(null)}
                disabled={processing}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={esegui}
                disabled={processing || previewLoading}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                Conferma esecuzione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG RIFIUTA */}
      {dialog?.type === 'rifiuta' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Rifiuta richiesta</h3>
            <p className="text-sm text-gray-500 mt-1">{dialog.r.guestEmail}</p>

            <label className="block text-xs font-medium text-gray-700 mt-4 mb-1">Motivo</label>
            <select
              value={rifiutaMotivo}
              onChange={(e) => setRifiutaMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="obbligo_legale_conservazione">Obbligo legale di conservazione</option>
              <option value="richiesta_incompleta">Richiesta incompleta</option>
              <option value="identita_non_verificata">Identità non verificata</option>
            </select>

            <label className="block text-xs font-medium text-gray-700 mt-4 mb-1">Dettagli (opzionale)</label>
            <textarea
              value={rifiutaDettagli}
              onChange={(e) => setRifiutaDettagli(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Spiegazione al richiedente"
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDialog(null)}
                disabled={processing}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={rifiuta}
                disabled={processing}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                Conferma rifiuto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TAB 2: RETENTION ───────────────────────────────────────────────────────

function RetentionTab() {
  const [policies, setPolicies] = useState<PolicyStatus[]>([])
  const [cron, setCron] = useState<{ ultimaEsecuzioneAt: string | null; ultimaEsecuzioneCompletata: boolean | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [lastRun, setLastRun] = useState<{ totalProcessed: number; totalErrors: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/host/gdpr/retention-status')
      const data = await res.json()
      setPolicies(data.policies ?? [])
      setCron(data.cron ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function esegui() {
    if (!confirm('Eseguire ora il job di retention? Anonimizza/cancella i dati scaduti per questo host.')) return
    setExecuting(true)
    try {
      const res = await fetch('/api/host/gdpr/retention-esegui', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setLastRun({ totalProcessed: data.totalProcessed, totalErrors: data.totalErrors })
        await load()
      } else alert(data.error ?? 'Errore')
    } finally {
      setExecuting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  const cronOk = cron?.ultimaEsecuzioneAt
    ? (Date.now() - new Date(cron.ultimaEsecuzioneAt).getTime()) < 48 * 60 * 60 * 1000
    : false

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-4 border ${cronOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className={`text-sm font-semibold ${cronOk ? 'text-emerald-900' : 'text-amber-900'}`}>
              {cronOk ? '✓ Cron retention attivo' : '⚠ Cron retention non eseguito recentemente'}
            </p>
            <p className={`text-xs mt-1 ${cronOk ? 'text-emerald-800' : 'text-amber-800'}`}>
              Ultima esecuzione: {cron?.ultimaEsecuzioneAt ? formatDate(cron.ultimaEsecuzioneAt) : 'mai'}
              {cron?.ultimaEsecuzioneCompletata === false && ' — interrotta per timeout, riprenderà alla prossima'}
            </p>
          </div>
          <button
            onClick={esegui}
            disabled={executing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Esegui ora
          </button>
        </div>
        {lastRun && (
          <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-current/10">
            Ultima esecuzione manuale: <strong>{lastRun.totalProcessed}</strong> record processati,{' '}
            <strong>{lastRun.totalErrors}</strong> errori
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Policy</th>
              <th className="px-4 py-3">Base giuridica</th>
              <th className="px-4 py-3">Retention</th>
              <th className="px-4 py-3">Scadenza 30gg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {policies.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{p.descrizione}</div>
                  <div className="text-xs text-gray-500">{p.entita} — {p.azione}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {p.baseGiuridica.replace('_', ' ')}
                  {p.riferimentoNormativo && <div className="text-gray-400">{p.riferimentoNormativo}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {p.giorniRetention > 365
                    ? `${Math.round(p.giorniRetention / 365 * 10) / 10} anni`
                    : `${p.giorniRetention} giorni`}
                </td>
                <td className="px-4 py-3">
                  {p.recordInScadenza30gg > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                      {p.recordInScadenza30gg}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── TAB 3: CONSENSI ────────────────────────────────────────────────────────

function ConsensiTab() {
  const [overview, setOverview] = useState<ConsentOverview[]>([])
  const [totaleOspiti, setTotaleOspiti] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/host/gdpr/consensi')
      const data = await res.json()
      setOverview(data.overview ?? [])
      setTotaleOspiti(data.totaleOspiti ?? 0)
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <strong className="text-gray-900">{totaleOspiti}</strong> ospiti hanno espresso almeno un consenso
        </p>
        <a
          href="/api/host/gdpr/consensi?export=csv"
          className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Esporta CSV
        </a>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Attivi</th>
              <th className="px-4 py-3">Revocati</th>
              <th className="px-4 py-3">Opt-in %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {overview.map((o) => (
              <tr key={o.tipo}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{o.label}</div>
                  {o.obbligatorio && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 mt-0.5 inline-block">
                      Necessario
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-600">{o.attivi}</td>
                <td className="px-4 py-3 text-red-600">{o.revocati}</td>
                <td className="px-4 py-3">
                  {o.percOptIn !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden max-w-[120px]">
                        <div
                          className="h-full bg-indigo-600"
                          style={{ width: `${o.percOptIn}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{o.percOptIn}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── TAB 4: ART. 30 ─────────────────────────────────────────────────────────

function Art30Tab() {
  const [policies, setPolicies] = useState<PolicyStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/host/gdpr/retention-status')
      const data = await res.json()
      setPolicies(data.policies ?? [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-indigo-900">Registro delle attività di trattamento</p>
          <p className="text-xs text-indigo-800 mt-1">
            Art. 30 Reg. UE 2016/679. Documentazione da conservare ed esibire al Garante su richiesta.
          </p>
        </div>
        <a
          href="/api/host/gdpr/registro-art30"
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Esporta PDF
        </a>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Trattamento</th>
              <th className="px-4 py-3">Base giuridica</th>
              <th className="px-4 py-3">Riferimento</th>
              <th className="px-4 py-3">Retention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {policies.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{p.descrizione}</div>
                  <div className="text-xs text-gray-500">{p.entita}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{p.baseGiuridica.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.riferimentoNormativo ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {p.giorniRetention > 365
                    ? `${Math.round(p.giorniRetention / 365 * 10) / 10} anni`
                    : `${p.giorniRetention} giorni`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
