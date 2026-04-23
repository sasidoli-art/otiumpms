'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Globe, Plus, X, Loader2, RefreshCw, CheckCircle2, AlertTriangle,
  Trash2, Copy, Check, ChevronRight, ChevronLeft, Link as LinkIcon, Info,
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type Canale = {
  id: string
  nome: string
  urlIcal: string
  attivo: boolean
  colore: string
  ultimoSync: string | null
  ultimoSyncOk: boolean
  ultimoSyncError: string | null
  eventiImportati: number
  struttura: { nome: string }
  unita: { id: string; nome: string } | null
  feedUrl: string | null
  _count: { prenotazioniImportate: number }
  createdAt: string
}

type Unita = { id: string; nome: string }
type Struttura = { id: string; nome: string; unita: Unita[] }

type OTA = {
  id: 'booking' | 'airbnb' | 'vrbo' | 'altro'
  nome: string
  colore: string
  descrizione: string
  placeholder: string
  istruzioni: string
}

const OTA_LIST: OTA[] = [
  {
    id: 'booking',
    nome: 'Booking.com',
    colore: '#003580',
    descrizione: 'Il portale di prenotazioni più usato al mondo',
    placeholder: 'https://admin.booking.com/hotel/hoteladmin/ical.html?t=...',
    istruzioni: 'Vai su Extranet → Tariffe e disponibilità → Sincronizzazione calendario → Copia l\'URL del feed iCal',
  },
  {
    id: 'airbnb',
    nome: 'Airbnb',
    colore: '#ff5a5f',
    descrizione: 'Affitti brevi e case vacanze',
    placeholder: 'https://www.airbnb.com/calendar/ical/XXXXX.ics?s=...',
    istruzioni: 'Vai su Calendario → Disponibilità → Importa/Esporta → Esporta calendario → Copia il link',
  },
  {
    id: 'vrbo',
    nome: 'VRBO / HomeAway',
    colore: '#1a6ee0',
    descrizione: 'Case vacanze — proprietà complete',
    placeholder: 'https://www.vrbo.com/icalendar/...',
    istruzioni: 'Vai su Calendario → Importa/Esporta → Esporta → Copia link iCal',
  },
  {
    id: 'altro',
    nome: 'Altro',
    colore: '#6b7280',
    descrizione: 'Google Calendar, Expedia, canale custom',
    placeholder: 'https://...',
    istruzioni: 'Trova l\'URL del feed iCal nel portale del canale',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Componente principale
// ────────────────────────────────────────────────────────────────────────────

export default function CanaliManagement() {
  const [canali, setCanali] = useState<Canale[]>([])
  const [strutture, setStrutture] = useState<Struttura[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/host/canali'),
        fetch('/api/host/strutture'),
      ])
      if (cRes.ok) setCanali(await cRes.json())
      if (sRes.ok) {
        const data = await sRes.json()
        if (Array.isArray(data)) setStrutture(data)
      }
    } catch {
      setErrore('Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carica() }, [carica])

  async function syncCanale(id: string) {
    setSyncingId(id); setErrore(null)
    try {
      const res = await fetch(`/api/host/canali/${id}/sync`, { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || 'Sync fallito')
      }
    } finally {
      setSyncingId(null)
      await carica()
    }
  }

  async function deleteCanale(id: string) {
    if (!confirm('Rimuovere questo canale? Le prenotazioni importate verranno cancellate.')) return
    await fetch(`/api/host/canali/${id}`, { method: 'DELETE' })
    await carica()
  }

  // Panoramica per camera
  const cameraStats = useMemo(() => {
    const map = new Map<string, { strutturaNome: string; unitaNome: string; canali: Canale[]; totBlocchi: number }>()
    for (const s of strutture) {
      for (const u of s.unita) {
        map.set(u.id, { strutturaNome: s.nome, unitaNome: u.nome, canali: [], totBlocchi: 0 })
      }
    }
    for (const c of canali) {
      if (!c.unita) continue
      const entry = map.get(c.unita.id)
      if (!entry) continue
      entry.canali.push(c)
      entry.totBlocchi += c._count.prenotazioniImportate
    }
    return Array.from(map.entries()).map(([unitaId, v]) => ({ unitaId, ...v }))
  }, [canali, strutture])

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-600" /> Canali di distribuzione
          </h1>
          <p className="text-sm text-gray-500">
            Sincronizza prenotazioni con Booking, Airbnb, VRBO. Evita overbooking grazie al calendario condiviso.
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" /> Collega canale
        </button>
      </div>

      {errore && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" /> {errore}
          <button onClick={() => setErrore(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ─── Lista canali ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-xl bg-white border border-gray-200 p-16 flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : canali.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-12 flex flex-col items-center gap-3">
          <Globe className="w-12 h-12 text-gray-300" />
          <p className="text-sm text-gray-500">Nessun canale collegato</p>
          <button
            onClick={() => setWizardOpen(true)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Collega il primo canale →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {canali.map((c) => (
            <CanaleCard
              key={c.id}
              canale={c}
              syncing={syncingId === c.id}
              onSync={() => syncCanale(c.id)}
              onDelete={() => deleteCanale(c.id)}
            />
          ))}
        </div>
      )}

      {/* ─── Panoramica per camera ──────────────────────────────────────── */}
      {!loading && cameraStats.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Panoramica per camera</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Camera</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Struttura</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Canali collegati</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Blocchi importati</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Stato</th>
                </tr>
              </thead>
              <tbody>
                {cameraStats.map((cs) => (
                  <tr key={cs.unitaId} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{cs.unitaNome}</td>
                    <td className="px-4 py-2.5 text-gray-600">{cs.strutturaNome}</td>
                    <td className="px-4 py-2.5">
                      {cs.canali.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          Suggerimento: collega un canale per evitare overbooking
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {cs.canali.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full"
                              style={{ background: c.colore + '15', color: c.colore }}
                            >
                              {c.nome}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{cs.totBlocchi}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {cs.canali.length > 0 ? 'Prossimo sync: entro 15 min' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Log sync ───────────────────────────────────────────────────── */}
      <LogSync />

      {/* ─── Wizard ─────────────────────────────────────────────────────── */}
      {wizardOpen && (
        <WizardNuovoCanale
          strutture={strutture}
          onClose={() => setWizardOpen(false)}
          onSuccess={async () => {
            setWizardOpen(false)
            await carica()
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Canale card
// ────────────────────────────────────────────────────────────────────────────

function CanaleCard({
  canale, syncing, onSync, onDelete,
}: {
  canale: Canale; syncing: boolean; onSync: () => void; onDelete: () => void
}) {
  const [copiato, setCopiato] = useState(false)

  function copyFeedUrl() {
    if (!canale.feedUrl) return
    navigator.clipboard.writeText(canale.feedUrl)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2000)
  }

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: canale.colore + '15' }}
        >
          <Globe className="w-5 h-5" style={{ color: canale.colore }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{canale.nome}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {canale.struttura.nome}
              {canale.unita ? ` · ${canale.unita.nome}` : ''}
            </span>
            {canale.attivo ? (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">Attivo</span>
            ) : (
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Disattivato</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            {canale.ultimoSync ? (
              <span className="flex items-center gap-1">
                {canale.ultimoSyncOk ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sincronizzato</>
                ) : (
                  <><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Errore sync</>
                )}
                {' · '}
                {format(new Date(canale.ultimoSync), 'd MMM HH:mm', { locale: it })}
              </span>
            ) : (
              <span className="text-gray-400">Mai sincronizzato</span>
            )}
            <span>{canale._count.prenotazioniImportate} blocchi importati</span>
          </div>

          {canale.ultimoSyncError && (
            <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
              {canale.ultimoSyncError}
            </p>
          )}

          {canale.feedUrl && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
              <LinkIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <code className="flex-1 text-[11px] text-gray-600 truncate">{canale.feedUrl}</code>
              <button
                onClick={copyFeedUrl}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded"
              >
                {copiato ? <><Check className="w-3 h-3" /> Copiato</> : <><Copy className="w-3 h-3" /> Copia</>}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onSync}
            disabled={syncing}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors disabled:opacity-50"
            title="Sincronizza ora"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
            title="Rimuovi"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Log sync
// ────────────────────────────────────────────────────────────────────────────

type LogItem = {
  id: string
  nome: string
  colore: string
  ultimoSync: string | null
  ultimoSyncOk: boolean
  ultimoSyncError: string | null
  eventiImportati: number
  struttura: { nome: string }
  unita: { nome: string } | null
}

function LogSync() {
  const [log, setLog] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/host/canali/log')
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setLog(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (log.length === 0) return null

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Log sincronizzazioni</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Data</th>
              <th className="text-left px-4 py-2.5 font-semibold">Canale</th>
              <th className="text-left px-4 py-2.5 font-semibold">Camera</th>
              <th className="text-right px-4 py-2.5 font-semibold">Eventi</th>
              <th className="text-left px-4 py-2.5 font-semibold">Stato</th>
            </tr>
          </thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                  {l.ultimoSync ? format(new Date(l.ultimoSync), 'd MMM HH:mm', { locale: it }) : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium"
                    style={{ background: l.colore + '15', color: l.colore }}
                  >
                    {l.nome}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {l.unita?.nome ?? l.struttura.nome}
                </td>
                <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{l.eventiImportati}</td>
                <td className="px-4 py-2.5">
                  {l.ultimoSyncOk ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> OK
                    </span>
                  ) : (
                    <div>
                      <span className="inline-flex items-center gap-1 text-xs text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5" /> Errore
                      </span>
                      {l.ultimoSyncError && (
                        <div className="text-[11px] text-red-600 mt-0.5">
                          {l.ultimoSyncError}
                          <span className="text-gray-500"> — Verifica che l&apos;URL del feed sia ancora valido.</span>
                        </div>
                      )}
                    </div>
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

// ────────────────────────────────────────────────────────────────────────────
// Wizard nuovo canale (5 step)
// ────────────────────────────────────────────────────────────────────────────

type WizardState = {
  ota: OTA | null
  strutturaId: string
  unitaId: string
  urlImport: string
  verificaResult: { ok: boolean; totale?: number; futuri?: number; error?: string } | null
  canaleCreatoId: string | null
}

function WizardNuovoCanale({
  strutture, onClose, onSuccess,
}: {
  strutture: Struttura[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [state, setState] = useState<WizardState>({
    ota: null, strutturaId: '', unitaId: '',
    urlImport: '', verificaResult: null, canaleCreatoId: null,
  })
  const [verifying, setVerifying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [feedUrl, setFeedUrl] = useState<string | null>(null)
  const [copiato, setCopiato] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Unita disponibili nella struttura selezionata
  const unitaDisponibili = useMemo(() => {
    const s = strutture.find((x) => x.id === state.strutturaId)
    return s?.unita ?? []
  }, [strutture, state.strutturaId])

  async function verificaUrl() {
    setVerifying(true); setErrore(null)
    try {
      const res = await fetch('/api/host/canali/verifica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: state.urlImport }),
      })
      const j = await res.json()
      setState((s) => ({ ...s, verificaResult: j }))
    } catch {
      setState((s) => ({ ...s, verificaResult: { ok: false, error: 'Errore di rete' } }))
    } finally {
      setVerifying(false)
    }
  }

  async function creaCanale() {
    setSaving(true); setErrore(null)
    try {
      const res = await fetch('/api/host/canali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strutturaId: state.strutturaId,
          unitaId: state.unitaId,
          nome: state.ota!.nome,
          urlIcal: state.urlImport,
          colore: state.ota!.colore,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Errore creazione canale')
      }
      const canale = await res.json()
      setState((s) => ({ ...s, canaleCreatoId: canale.id }))
      // Costruisci feed URL lato client per la step 4
      // L'URL completo è ritornato dal GET /api/host/canali, quindi interroghiamo quello
      const listRes = await fetch('/api/host/canali')
      if (listRes.ok) {
        const lista: Canale[] = await listRes.json()
        const match = lista.find((c) => c.id === canale.id)
        setFeedUrl(match?.feedUrl ?? null)
      }
      setStep(4)
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  async function sincronizzaSubito() {
    if (!state.canaleCreatoId) return
    setSyncing(true)
    await fetch(`/api/host/canali/${state.canaleCreatoId}/sync`, { method: 'POST' })
    setSyncing(false)
    onSuccess()
  }

  function copy(s: string) {
    navigator.clipboard.writeText(s)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Collega un canale</h2>
            <p className="text-xs text-gray-500">Step {step} di 5</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errore && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errore}
            </div>
          )}

          {/* ─── Step 1: scegli canale ──────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Quale canale vuoi collegare?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OTA_LIST.map((ota) => (
                  <button
                    key={ota.id}
                    onClick={() => setState((s) => ({ ...s, ota }))}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      state.ota?.id === ota.id
                        ? 'border-indigo-600 bg-indigo-50/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: ota.colore + '15' }}
                      >
                        <Globe className="w-4 h-4" style={{ color: ota.colore }} />
                      </div>
                      <span className="font-semibold text-gray-900">{ota.nome}</span>
                    </div>
                    <p className="text-xs text-gray-500">{ota.descrizione}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 2: scegli camera ──────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">A quale camera è collegato questo canale?</h3>
              <p className="text-xs text-gray-500 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                Ogni canale è collegato a una singola camera. Per collegare più camere, aggiungi un canale per ciascuna.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Struttura</label>
                <select
                  value={state.strutturaId}
                  onChange={(e) => setState((s) => ({ ...s, strutturaId: e.target.value, unitaId: '' }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Seleziona struttura...</option>
                  {strutture.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              {state.strutturaId && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Camera</label>
                  <select
                    value={state.unitaId}
                    onChange={(e) => setState((s) => ({ ...s, unitaId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Seleziona camera...</option>
                    {unitaDisponibili.map((u) => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ─── Step 3: URL import ──────────────────────────────────── */}
          {step === 3 && state.ota && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">URL feed di importazione</h3>
              <p className="text-xs text-gray-700 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <strong>{state.ota.nome}:</strong> {state.ota.istruzioni}
              </p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  URL iCal di {state.ota.nome}
                </label>
                <input
                  type="url"
                  value={state.urlImport}
                  onChange={(e) => setState((s) => ({ ...s, urlImport: e.target.value, verificaResult: null }))}
                  placeholder={state.ota.placeholder}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={verificaUrl}
                  disabled={!state.urlImport || verifying}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Verifica URL
                </button>
              </div>
              {state.verificaResult && (
                state.verificaResult.ok ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Feed valido
                    </div>
                    <p className="text-xs mt-1">
                      Trovati <strong>{state.verificaResult.totale}</strong> eventi totali
                      {typeof state.verificaResult.futuri === 'number' && <>, di cui <strong>{state.verificaResult.futuri}</strong> futuri.</>}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="w-4 h-4" /> URL non raggiungibile
                    </div>
                    <p className="text-xs mt-1">{state.verificaResult.error}</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* ─── Step 4: URL export da copiare ──────────────────────── */}
          {step === 4 && feedUrl && state.ota && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">URL feed di esportazione</h3>
              <p className="text-sm text-gray-600">
                Questo URL condivide le date occupate di questa camera con <strong>{state.ota.nome}</strong>,
                evitando doppie prenotazioni.
              </p>
              <p className="text-xs text-gray-700 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <strong>Incolla questo URL su {state.ota.nome}</strong> nella sezione &ldquo;Importa calendario esterno&rdquo;.
              </p>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <code className="block text-xs text-gray-800 break-all font-mono">{feedUrl}</code>
                <button
                  onClick={() => copy(feedUrl)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
                >
                  {copiato ? <><Check className="w-4 h-4" /> Copiato!</> : <><Copy className="w-4 h-4" /> Copia URL</>}
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 5: conferma ───────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-4 text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Canale collegato!</h3>
                <p className="text-sm text-gray-600 mt-1">
                  La prima sincronizzazione avverrà entro 15 minuti.
                </p>
              </div>
              <button
                onClick={sincronizzaSubito}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sincronizza subito
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => step > 1 && setStep((step - 1) as 1 | 2 | 3 | 4 | 5)}
            disabled={step === 1 || step === 5}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Indietro
          </button>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!state.ota}
                className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                Avanti <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={!state.strutturaId || !state.unitaId}
                className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                Avanti <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={creaCanale}
                disabled={!state.verificaResult?.ok || saving}
                className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Crea canale <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 4 && (
              <button
                onClick={() => setStep(5)}
                className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg"
              >
                Fatto <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 5 && (
              <button
                onClick={onSuccess}
                className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg"
              >
                Chiudi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
