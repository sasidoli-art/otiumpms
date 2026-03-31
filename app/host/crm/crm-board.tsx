'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Search, Plus, Ban, Users, X, ChevronRight, Loader2,
  Crown, ChevronLeft, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown,
  Tag, Globe,
} from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Ospite = {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
  nazionalita: string | null
  lingua: string | null
  note: string | null
  preferenze: string | null
  vip: boolean
  blacklist: boolean
  blacklistMotivo: string | null
  tags: string[]
  numSoggiorni: number
  totaleSpeso: number
  dataUltimoSoggiorno: string | null
  createdAt: string
}

type SortField = 'cognome' | 'nome' | 'email' | 'numSoggiorni' | 'totaleSpeso' | 'dataUltimoSoggiorno' | 'createdAt'
type SortDir = 'asc' | 'desc'

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CrmBoard({
  ospiteIniziali,
  kpi,
}: {
  ospiteIniziali: Ospite[]
  kpi: { totale: number; vip: number; blacklist: number }
}) {
  const [ospiti, setOspiti] = useState<Ospite[]>(ospiteIniziali)
  const [totale, setTotale] = useState(kpi.totale)
  const [q, setQ] = useState('')
  const [filtroVip, setFiltroVip] = useState(false)
  const [filtroBlacklist, setFiltroBlacklist] = useState(false)
  const [filtroTag, setFiltroTag] = useState('')
  const [filtroNazionalita, setFiltroNazionalita] = useState('')
  const [loading, setLoading] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [pagine, setPagine] = useState(Math.ceil(kpi.totale / 20))
  const [perPage, setPerPage] = useState(20)
  const [modalAperto, setModalAperto] = useState(false)
  const [sort, setSort] = useState<SortField>('cognome')
  const [dir, setDir] = useState<SortDir>('asc')
  const [allTags, setAllTags] = useState<string[]>([])
  const [allNazionalita, setAllNazionalita] = useState<string[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cerca = useCallback(async (params: {
    query?: string
    vip?: boolean
    bl?: boolean
    tag?: string
    nazionalita?: string
    p?: number
    pp?: number
    sortField?: SortField
    sortDir?: SortDir
  }) => {
    setLoading(true)
    const sp = new URLSearchParams({ page: String(params.p ?? 1), perPage: String(params.pp ?? 20) })
    if (params.query) sp.set('q', params.query)
    if (params.vip) sp.set('vip', 'true')
    if (params.bl) sp.set('blacklist', 'true')
    if (params.tag) sp.set('tag', params.tag)
    if (params.nazionalita) sp.set('nazionalita', params.nazionalita)
    if (params.sortField) { sp.set('sort', params.sortField); sp.set('dir', params.sortDir ?? 'asc') }
    const res = await fetch(`/api/host/crm?${sp}`)
    if (res.ok) {
      const data = await res.json()
      setOspiti(data.ospiti)
      setTotale(data.totale)
      setPagine(data.pagine)
      if (data.tags) setAllTags(data.tags)
      if (data.nazionalita) setAllNazionalita(data.nazionalita)
    }
    setLoading(false)
  }, [])

  // Load tags/nazionalita on mount
  useEffect(() => {
    cerca({ p: 1, pp: perPage, sortField: sort, sortDir: dir })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fetchCurrent(overrides: Partial<{
    query: string; vip: boolean; bl: boolean; tag: string; nazionalita: string;
    p: number; pp: number; sortField: SortField; sortDir: SortDir
  }> = {}) {
    const params = {
      query: overrides.query ?? q,
      vip: overrides.vip ?? filtroVip,
      bl: overrides.bl ?? filtroBlacklist,
      tag: overrides.tag ?? filtroTag,
      nazionalita: overrides.nazionalita ?? filtroNazionalita,
      p: overrides.p ?? pagina,
      pp: overrides.pp ?? perPage,
      sortField: overrides.sortField ?? sort,
      sortDir: overrides.sortDir ?? dir,
    }
    cerca(params)
  }

  function handleSearch(val: string) {
    setQ(val)
    setPagina(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchCurrent({ query: val, p: 1 })
    }, 300)
  }

  function toggleVip() {
    const n = !filtroVip; setFiltroVip(n); setPagina(1)
    fetchCurrent({ vip: n, p: 1 })
  }
  function toggleBl() {
    const n = !filtroBlacklist; setFiltroBlacklist(n); setPagina(1)
    fetchCurrent({ bl: n, p: 1 })
  }
  function handleTagFilter(tag: string) {
    setFiltroTag(tag); setPagina(1)
    fetchCurrent({ tag, p: 1 })
  }
  function handleNazionalitaFilter(naz: string) {
    setFiltroNazionalita(naz); setPagina(1)
    fetchCurrent({ nazionalita: naz, p: 1 })
  }
  function handleSort(field: SortField) {
    const newDir: SortDir = sort === field && dir === 'asc' ? 'desc' : 'asc'
    setSort(field); setDir(newDir); setPagina(1)
    fetchCurrent({ sortField: field, sortDir: newDir, p: 1 })
  }
  function cambiaPagina(p: number) {
    setPagina(p)
    fetchCurrent({ p })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function handlePerPage(pp: number) {
    setPerPage(pp); setPagina(1)
    fetchCurrent({ pp, p: 1 })
  }

  function onCreato(ospite: Ospite) {
    setOspiti(prev => [ospite, ...prev])
    setTotale(t => t + 1)
    setModalAperto(false)
  }

  function clearFilters() {
    setQ(''); setFiltroVip(false); setFiltroBlacklist(false); setFiltroTag(''); setFiltroNazionalita('')
    setSort('cognome'); setDir('asc'); setPagina(1)
    cerca({ p: 1, pp: perPage, sortField: 'cognome', sortDir: 'asc' })
  }

  const hasFilters = q || filtroVip || filtroBlacklist || filtroTag || filtroNazionalita

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box">
        <div>
          <h1 className="page-title">CRM Ospiti</h1>
          <p className="text-sm text-gray-500">Anagrafica, storico soggiorni e preferenze</p>
        </div>
        <button onClick={() => setModalAperto(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo ospite
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/10">
            <Users className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{kpi.totale}</p>
            <p className="text-xs text-gray-500">Ospiti totali</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-50">
            <Crown className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-yellow-600">{kpi.vip}</p>
            <p className="text-xs text-gray-500">Ospiti VIP</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50">
            <Ban className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-red-600">{kpi.blacklist}</p>
            <p className="text-xs text-gray-500">Blacklist</p>
          </div>
        </div>
      </div>

      {/* Barra ricerca + filtri */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Cerca per nome, cognome, email, telefono..."
              className="input pl-9"
            />
            {q && (
              <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* VIP / Blacklist toggles */}
          <button
            onClick={toggleVip}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              filtroVip ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> VIP
          </button>
          <button
            onClick={toggleBl}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              filtroBlacklist ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Ban className="w-3.5 h-3.5" /> Blacklist
          </button>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="relative">
              <select
                value={filtroTag}
                onChange={e => handleTagFilter(e.target.value)}
                className="appearance-none pl-8 pr-6 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <option value="">Tutti i tag</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Nazionalita filter */}
          {allNazionalita.length > 0 && (
            <div className="relative">
              <select
                value={filtroNazionalita}
                onChange={e => handleNazionalitaFilter(e.target.value)}
                className="appearance-none pl-8 pr-6 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <option value="">Tutte le nazionalita</option>
                {allNazionalita.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Clear filters */}
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3 h-3" /> Azzera filtri
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400">{totale} ospiti</span>
        </div>
      </div>

      {/* Tabella */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">
                  <button onClick={() => handleSort('cognome')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Ospite <SortIcon field="cognome" />
                  </button>
                </th>
                <th className="table-th hidden md:table-cell">
                  <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Email / Tel <SortIcon field="email" />
                  </button>
                </th>
                <th className="table-th hidden lg:table-cell">
                  <button onClick={() => handleSort('numSoggiorni')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Soggiorni <SortIcon field="numSoggiorni" />
                  </button>
                </th>
                <th className="table-th hidden lg:table-cell">
                  <button onClick={() => handleSort('totaleSpeso')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Spesa totale <SortIcon field="totaleSpeso" />
                  </button>
                </th>
                <th className="table-th hidden xl:table-cell">
                  <button onClick={() => handleSort('dataUltimoSoggiorno')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Ultimo soggiorno <SortIcon field="dataUltimoSoggiorno" />
                  </button>
                </th>
                <th className="table-th hidden md:table-cell">Tag</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {ospiti.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400 text-sm">
                    {hasFilters ? 'Nessun risultato per i filtri selezionati' : 'Nessun ospite ancora'}
                  </td>
                </tr>
              ) : (
                ospiti.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/60 group">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          o.blacklist ? 'bg-red-100 text-red-600' : o.vip ? 'bg-yellow-100 text-yellow-700' : 'bg-brand-500/10 text-brand-600'
                        }`}>
                          {o.nome[0]}{o.cognome[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-1">
                            {o.cognome} {o.nome}
                            {o.vip && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                            {o.blacklist && <Ban className="w-3.5 h-3.5 text-red-500" />}
                          </p>
                          {o.nazionalita && <p className="text-xs text-gray-400">{o.nazionalita}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="table-td hidden md:table-cell">
                      <p className="text-gray-700">{o.email}</p>
                      {o.telefono && <p className="text-xs text-gray-400">{o.telefono}</p>}
                    </td>
                    <td className="table-td hidden lg:table-cell text-center">
                      <span className={`font-semibold ${o.numSoggiorni > 0 ? 'text-brand-600' : 'text-gray-400'}`}>
                        {o.numSoggiorni}
                      </span>
                    </td>
                    <td className="table-td hidden lg:table-cell">
                      <span className={o.totaleSpeso > 0 ? 'font-medium text-gray-800' : 'text-gray-400'}>
                        {o.totaleSpeso > 0 ? `€${o.totaleSpeso.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="table-td hidden xl:table-cell text-gray-500">
                      {o.dataUltimoSoggiorno
                        ? format(new Date(o.dataUltimoSoggiorno), 'd MMM yyyy', { locale: it })
                        : '—'}
                    </td>
                    <td className="table-td hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {o.tags.slice(0, 3).map(t => (
                          <button
                            key={t}
                            onClick={() => handleTagFilter(t)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-700 font-medium hover:bg-brand-500/20 transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                        {o.tags.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            +{o.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-td">
                      <Link
                        href={`/host/crm/${o.id}`}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-brand-500 hover:bg-brand-50 transition-colors flex items-center"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginazione migliorata */}
      {pagine > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Rows per page */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Righe:</span>
            {[10, 20, 50].map(pp => (
              <button
                key={pp}
                onClick={() => handlePerPage(pp)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  perPage === pp ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pp}
              </button>
            ))}
          </div>

          {/* Page info */}
          <span className="text-xs text-gray-400">
            {Math.min((pagina - 1) * perPage + 1, totale)}–{Math.min(pagina * perPage, totale)} di {totale}
          </span>

          {/* Page nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => cambiaPagina(1)}
              disabled={pagina <= 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => cambiaPagina(pagina - 1)}
              disabled={pagina <= 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            {getPageRange(pagina, pagine).map(p =>
              p === -1 ? (
                <span key={`e-${Math.random()}`} className="w-8 h-8 flex items-center justify-center text-gray-300 text-xs">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => cambiaPagina(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    p === pagina ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => cambiaPagina(pagina + 1)}
              disabled={pagina >= pagine}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => cambiaPagina(pagine)}
              disabled={pagina >= pagine}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal nuovo ospite */}
      {modalAperto && (
        <NuovoOspiteModal onClose={() => setModalAperto(false)} onCreato={onCreato} />
      )}
    </div>
  )
}

// ─── Page range helper ────────────────────────────────────────────────────────

function getPageRange(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: number[] = []
  pages.push(1)
  if (current > 3) pages.push(-1) // ellipsis
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push(-1) // ellipsis
  pages.push(total)
  return pages
}

// ─── Modal nuovo ospite ───────────────────────────────────────────────────────

function NuovoOspiteModal({
  onClose,
  onCreato,
}: {
  onClose: () => void
  onCreato: (o: Ospite) => void
}) {
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', telefono: '',
    nazionalita: '', lingua: 'it', note: '', preferenze: '',
    vip: false, tags: '',
  })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.cognome || !form.email) {
      setErrore('Nome, cognome ed email sono obbligatori'); return
    }
    setLoading(true); setErrore('')
    const res = await fetch('/api/host/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }),
    })
    if (!res.ok) {
      const j = await res.json(); setErrore(j.error || 'Errore'); setLoading(false); return
    }
    const ospite = await res.json()
    onCreato({ ...ospite, dataUltimoSoggiorno: ospite.dataUltimoSoggiorno ?? null })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-gray-900">Nuovo ospite CRM</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errore && <p className="text-sm text-red-600">{errore}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome *</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Cognome *</label>
              <input type="text" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefono</label>
              <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Nazionalita</label>
              <input type="text" value={form.nazionalita} onChange={e => setForm(f => ({ ...f, nazionalita: e.target.value }))} className="input" placeholder="es. Italiana" />
            </div>
          </div>
          <div>
            <label className="label">Preferenze</label>
            <textarea rows={2} value={form.preferenze} onChange={e => setForm(f => ({ ...f, preferenze: e.target.value }))} className="input" placeholder="Piano alto, letto matrimoniale, allergie..." />
          </div>
          <div>
            <label className="label">Note interne</label>
            <textarea rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="input" placeholder="Visibile solo a te" />
          </div>
          <div>
            <label className="label">Tag (separati da virgola)</label>
            <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="input" placeholder="fedele, business, famiglia" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="vip" checked={form.vip} onChange={e => setForm(f => ({ ...f, vip: e.target.checked }))} className="w-4 h-4 accent-yellow-500" />
            <label htmlFor="vip" className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Crown className="w-4 h-4 text-yellow-500" /> Ospite VIP
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Salvo...' : 'Crea ospite'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  )
}
