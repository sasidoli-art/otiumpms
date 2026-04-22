'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Search, X, Loader2, ChevronRight, Users, Plus, Eye,
  UserX, Pause, LogIn, AlertCircle, CheckCircle2,
} from 'lucide-react'

type Host = {
  id: string
  nomeAzienda: string
  partitaIva: string | null
  email: string
  userNome: string
  piano: string
  statoAbbonamento: string
  dataInizioAbb: string | null
  dataFineAbb: string | null
  strutturaCount: number
  prenotazioniCount: number
  moduliAttiviCount: number
  moduliAttivi: string[]
  mrr: number
  onboardingCompletato: boolean
  onboardingStep: number
  createdAt: string
  updatedAt: string
}

type StatoFilter = '' | 'ATTIVO' | 'IN_PROVA' | 'SCADUTO' | 'SOSPESO'
type PianoFilter = '' | 'LIGHT' | 'EVENTO_SINGOLO' | 'VISIBILITA_MENSILE' | 'PARTNER_PREMIUM'

const PIANO_LABEL: Record<string, string> = {
  LIGHT: 'Light',
  EVENTO_SINGOLO: 'Evento',
  VISIBILITA_MENSILE: 'Visibilità',
  PARTNER_PREMIUM: 'Premium',
}

const STATO_CLS: Record<string, string> = {
  ATTIVO: 'bg-green-50 text-green-700 ring-1 ring-green-200/60',
  IN_PROVA: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
  SCADUTO: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/60',
  SOSPESO: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200/60',
}

const STATO_LABEL: Record<string, string> = {
  ATTIVO: 'Attivo',
  IN_PROVA: 'Trial',
  SCADUTO: 'Scaduto',
  SOSPESO: 'Sospeso',
}

export default function HostLista() {
  const router = useRouter()
  const [hosts, setHosts] = useState<Host[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [stato, setStato] = useState<StatoFilter>('')
  const [piano, setPiano] = useState<PianoFilter>('')
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (stato) sp.set('stato', stato)
    if (piano) sp.set('piano', piano)

    const res = await fetch(`/api/admin/host?${sp}`)
    if (res.ok) {
      const d = await res.json()
      setHosts(d.hosts)
      setTotal(d.pagination.total)
    } else {
      setError('Errore caricamento')
    }
    setLoading(false)
  }, [q, stato, piano])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(load, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [load])

  async function impersona(h: Host) {
    if (!window.confirm(`Accedere come ${h.nomeAzienda}?\n\nVisualizzerai la dashboard host e tutte le azioni saranno loggate.`)) return
    const res = await fetch(`/api/admin/host/${h.id}/impersona`, { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      router.push(d.redirectTo ?? '/host/dashboard')
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Errore impersonation')
    }
  }

  async function sospendi(h: Host) {
    const sospendiAzione = h.statoAbbonamento !== 'SOSPESO'
    const verbo = sospendiAzione ? 'Sospendere' : 'Riattivare'
    const motivo = sospendiAzione
      ? window.prompt(`${verbo} l'account di ${h.nomeAzienda}?\nMotivo (opzionale):`)
      : ''
    if (motivo === null) return

    const res = await fetch(`/api/admin/host/${h.id}/sospendi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sospendi: sospendiAzione, motivo: motivo || undefined }),
    })
    if (res.ok) load()
    else setError('Errore cambio stato')
  }

  async function elimina(h: Host) {
    if (!window.confirm(`ELIMINARE definitivamente ${h.nomeAzienda}?\n\nAccount disattivato + pipeline GDPR per dati ospiti.\nOperazione non reversibile.`)) return
    const res = await fetch(`/api/admin/host/${h.id}`, { method: 'DELETE' })
    if (res.ok) load()
    else setError('Errore eliminazione')
  }

  const hasFilters = q || stato || piano

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-title-box">
        <div>
          <h1 className="page-title">Host</h1>
          <p className="text-sm text-gray-500">
            Gestione clienti piattaforma · {total} totali
          </p>
        </div>
        <Link href="/admin/host/nuovo" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Invita host
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Filtri */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca azienda, email, P.IVA..."
              className="input pl-9"
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={piano}
            onChange={(e) => setPiano(e.target.value as PianoFilter)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium"
          >
            <option value="">Tutti i piani</option>
            <option value="LIGHT">Light</option>
            <option value="EVENTO_SINGOLO">Evento</option>
            <option value="VISIBILITA_MENSILE">Visibilità</option>
            <option value="PARTNER_PREMIUM">Premium</option>
          </select>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        {/* Pills stato */}
        <div className="flex flex-wrap items-center gap-2">
          {(['', 'ATTIVO', 'IN_PROVA', 'SCADUTO', 'SOSPESO'] as StatoFilter[]).map((s) => (
            <button
              key={s || 'tutti'}
              onClick={() => setStato(s)}
              className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                stato === s
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s ? STATO_LABEL[s] : 'Tutti'}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={() => { setQ(''); setStato(''); setPiano('') }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Azzera
            </button>
          )}
        </div>
      </div>

      {/* Tabella */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="table-th">Azienda</th>
                <th className="table-th hidden md:table-cell">Email</th>
                <th className="table-th">Piano</th>
                <th className="table-th hidden lg:table-cell">MRR</th>
                <th className="table-th hidden lg:table-cell text-center">Strutture</th>
                <th className="table-th hidden xl:table-cell text-center">Moduli</th>
                <th className="table-th hidden xl:table-cell">Ultimo accesso</th>
                <th className="table-th">Stato</th>
                <th className="table-th text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {hosts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-gray-400 text-sm">
                    {hasFilters ? 'Nessun host per i filtri selezionati' : 'Nessun host registrato'}
                  </td>
                </tr>
              ) : hosts.map((h) => (
                <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/60 group">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-500/5 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">
                        {h.nomeAzienda.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{h.nomeAzienda}</p>
                        {h.partitaIva && <p className="text-[10px] text-gray-400 font-mono">{h.partitaIva}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="table-td hidden md:table-cell text-gray-600 truncate max-w-[200px]">{h.email}</td>
                  <td className="table-td">
                    <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {PIANO_LABEL[h.piano] ?? h.piano}
                    </span>
                  </td>
                  <td className="table-td hidden lg:table-cell">
                    {h.mrr > 0 ? (
                      <span className="font-semibold text-gray-900">€{h.mrr}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-td hidden lg:table-cell text-center text-gray-700">{h.strutturaCount}</td>
                  <td className="table-td hidden xl:table-cell text-center">
                    <span
                      className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded cursor-help"
                      title={h.moduliAttivi.join(', ')}
                    >
                      {h.moduliAttiviCount}
                    </span>
                  </td>
                  <td className="table-td hidden xl:table-cell text-xs text-gray-500">
                    {format(new Date(h.updatedAt), 'd MMM HH:mm', { locale: it })}
                  </td>
                  <td className="table-td">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATO_CLS[h.statoAbbonamento] ?? STATO_CLS.SOSPESO}`}>
                      {STATO_LABEL[h.statoAbbonamento] ?? h.statoAbbonamento}
                    </span>
                    {!h.onboardingCompletato && (
                      <span className="block text-[10px] text-amber-600 mt-0.5">Onb. {h.onboardingStep}/5</span>
                    )}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/host/${h.id}`}
                        className="p-1.5 rounded text-gray-500 hover:text-brand-600 hover:bg-brand-50"
                        title="Dettaglio"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => impersona(h)}
                        className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        title="Impersona"
                      >
                        <LogIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => sospendi(h)}
                        className="p-1.5 rounded text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                        title={h.statoAbbonamento === 'SOSPESO' ? 'Riattiva' : 'Sospendi'}
                      >
                        {h.statoAbbonamento === 'SOSPESO' ? <CheckCircle2 className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => elimina(h)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Elimina"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/admin/host/${h.id}`}
                        className="p-1.5 rounded text-gray-300 hover:text-gray-600"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
