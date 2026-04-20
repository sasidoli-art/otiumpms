'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Search, Plus, Ban, Users, X, ChevronRight, Loader2,
  Crown, ChevronLeft, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown,
  Tag, Globe, Download, Repeat, Calendar, CheckSquare, Square,
} from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export type OspiteRow = {
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
type FilterPill = 'tutti' | 'vip' | 'blacklist' | 'ricorrenti'
type UltimoSoggiornoFilter = '' | '30' | '90' | '365'

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ListaOspiti({
  ospiteIniziali,
  kpi,
}: {
  ospiteIniziali: OspiteRow[]
  kpi: { totale: number; vip: number; blacklist: number; ricorrenti: number }
}) {
  const [ospiti, setOspiti] = useState<OspiteRow[]>(ospiteIniziali)
  const [totale, setTotale] = useState(kpi.totale)
  const [q, setQ] = useState('')
  const [pill, setPill] = useState<FilterPill>('tutti')
  const [filtroTags, setFiltroTags] = useState<string[]>([])
  const [filtroNazionalita, setFiltroNazionalita] = useState('')
  const [filtroUltimo, setFiltroUltimo] = useState<UltimoSoggiornoFilter>('')
  const [loading, setLoading] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [pagine, setPagine] = useState(Math.ceil(kpi.totale / 20))
  const [perPage, setPerPage] = useState(20)
  const [modalAperto, setModalAperto] = useState(false)
  const [sort, setSort] = useState<SortField>('cognome')
  const [dir, setDir] = useState<SortDir>('asc')
  const [allTags, setAllTags] = useState<string[]>([])
  const [allNazionalita, setAllNazionalita] = useState<string[]>([])
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkError, setBulkError] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildParams = useCallback((overrides: Partial<{
    query: string; pill: FilterPill; tags: string[]; nazionalita: string;
    ultimo: UltimoSoggiornoFilter; p: number; pp: number;
    sortField: SortField; sortDir: SortDir
  }>) => {
    const sp = new URLSearchParams()
    sp.set('page', String(overrides.p ?? pagina))
    sp.set('perPage', String(overrides.pp ?? perPage))
    const query = overrides.query ?? q
    if (query) sp.set('q', query)
    const pl = overrides.pill ?? pill
    if (pl === 'vip') sp.set('vip', 'true')
    if (pl === 'blacklist') sp.set('blacklist', 'true')
    if (pl === 'ricorrenti') sp.set('ricorrenti', 'true')
    const tgs = overrides.tags ?? filtroTags
    tgs.forEach((t) => sp.append('tags', t))
    const naz = overrides.nazionalita ?? filtroNazionalita
    if (naz) sp.set('nazionalita', naz)
    const ult = overrides.ultimo ?? filtroUltimo
    if (ult) sp.set('ultimoSoggiorno', ult)
    const sf = overrides.sortField ?? sort
    const sd = overrides.sortDir ?? dir
    sp.set('sort', sf)
    sp.set('dir', sd)
    return sp
  }, [q, pill, filtroTags, filtroNazionalita, filtroUltimo, pagina, perPage, sort, dir])

  const cerca = useCallback(async (overrides: Parameters<typeof buildParams>[0]) => {
    setLoading(true)
    const sp = buildParams(overrides)
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
  }, [buildParams])

  useEffect(() => {
    cerca({ p: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearch(val: string) {
    setQ(val); setPagina(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => cerca({ query: val, p: 1 }), 300)
  }

  function selectPill(p: FilterPill) {
    setPill(p); setPagina(1)
    cerca({ pill: p, p: 1 })
  }

  function toggleTag(tag: string) {
    const next = filtroTags.includes(tag)
      ? filtroTags.filter((t) => t !== tag)
      : [...filtroTags, tag]
    setFiltroTags(next); setPagina(1)
    cerca({ tags: next, p: 1 })
  }

  function handleUltimoFilter(v: UltimoSoggiornoFilter) {
    setFiltroUltimo(v); setPagina(1)
    cerca({ ultimo: v, p: 1 })
  }

  function handleNazionalitaFilter(naz: string) {
    setFiltroNazionalita(naz); setPagina(1)
    cerca({ nazionalita: naz, p: 1 })
  }

  function handleSort(field: SortField) {
    const newDir: SortDir = sort === field && dir === 'asc' ? 'desc' : 'asc'
    setSort(field); setDir(newDir); setPagina(1)
    cerca({ sortField: field, sortDir: newDir, p: 1 })
  }

  function cambiaPagina(p: number) {
    setPagina(p); cerca({ p })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handlePerPage(pp: number) {
    setPerPage(pp); setPagina(1); cerca({ pp, p: 1 })
  }

  function clearFilters() {
    setQ(''); setPill('tutti'); setFiltroTags([]); setFiltroNazionalita(''); setFiltroUltimo('')
    setSort('cognome'); setDir('asc'); setPagina(1)
    cerca({ query: '', pill: 'tutti', tags: [], nazionalita: '', ultimo: '', sortField: 'cognome', sortDir: 'asc', p: 1 })
  }

  const hasFilters = q || pill !== 'tutti' || filtroTags.length > 0 || filtroNazionalita || filtroUltimo

  function onCreato(ospite: OspiteRow) {
    setOspiti((prev) => [ospite, ...prev])
    setTotale((t) => t + 1)
    setModalAperto(false)
  }

  // ── Selezione multipla ──
  function toggleSelezione(id: string) {
    setSelezionati((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelezioneAll() {
    const allIds = ospiti.map((o) => o.id)
    const tuttiSel = allIds.every((id) => selezionati.has(id))
    if (tuttiSel) {
      setSelezionati((prev) => {
        const next = new Set(prev)
        allIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelezionati((prev) => new Set([...prev, ...allIds]))
    }
  }

  async function bulkSetVip(vip: boolean) {
    setBulkBusy(true); setBulkError('')
    try {
      const ids = Array.from(selezionati)
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/host/crm/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vip }),
        })),
      )
      const falliti = results.filter((r) => !r.ok).length
      if (falliti > 0) setBulkError(`${falliti} aggiornamenti falliti`)
      setSelezionati(new Set())
      await cerca({})
    } finally {
      setBulkBusy(false)
    }
  }

  async function bulkAddTag(tag: string) {
    if (!tag.trim()) return
    setBulkBusy(true); setBulkError('')
    try {
      const ids = Array.from(selezionati)
      const results = await Promise.all(
        ids.map(async (id) => {
          const o = ospiti.find((x) => x.id === id)
          if (!o) return { ok: true }
          const nuoviTags = Array.from(new Set([...(o.tags ?? []), tag.trim()]))
          return fetch(`/api/host/crm/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: nuoviTags }),
          })
        }),
      )
      const falliti = results.filter((r) => !r.ok).length
      if (falliti > 0) setBulkError(`${falliti} aggiornamenti falliti`)
      setSelezionati(new Set())
      await cerca({})
    } finally {
      setBulkBusy(false)
    }
  }

  function esportaCSV() {
    const sp = buildParams({})
    sp.delete('page'); sp.delete('perPage')
    window.location.href = `/api/host/crm/export?${sp}`
  }

  const selezionatiCount = selezionati.size
  const allSelectedInPage = ospiti.length > 0 && ospiti.every((o) => selezionati.has(o.id))

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
  }

  const kpiCards = useMemo(() => [
    { label: 'Totale ospiti', value: kpi.totale, icon: Users, bg: 'bg-brand-500/10', color: 'text-brand-500', numColor: 'text-gray-900' },
    { label: 'VIP', value: kpi.vip, icon: Crown, bg: 'bg-yellow-50', color: 'text-yellow-500', numColor: 'text-yellow-600' },
    { label: 'Ricorrenti', value: kpi.ricorrenti, icon: Repeat, bg: 'bg-blue-50', color: 'text-blue-500', numColor: 'text-blue-600' },
    { label: 'Blacklist', value: kpi.blacklist, icon: Ban, bg: 'bg-red-50', color: 'text-red-500', numColor: 'text-red-600' },
  ], [kpi])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box">
        <div>
          <h1 className="page-title">CRM Ospiti</h1>
          <p className="text-sm text-gray-500">Gestione anagrafica, preferenze e storico ospiti</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={esportaCSV} className="btn-secondary flex items-center gap-2" title="Esporta CSV">
            <Download className="w-4 h-4" /> Esporta
          </button>
          <button onClick={() => setModalAperto(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuovo ospite
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="card flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${k.bg}`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-extrabold ${k.numColor}`}>{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barra ricerca + filtri */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cerca per nome, email, telefono…"
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

        {/* Pill filters */}
        <div className="flex flex-wrap items-center gap-2">
          {([
            { k: 'tutti' as FilterPill, label: 'Tutti', icon: Users },
            { k: 'vip' as FilterPill, label: 'VIP', icon: Crown },
            { k: 'ricorrenti' as FilterPill, label: 'Ricorrenti', icon: Repeat },
            { k: 'blacklist' as FilterPill, label: 'Blacklist', icon: Ban },
          ]).map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => selectPill(k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                pill === k
                  ? k === 'vip' ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                    : k === 'blacklist' ? 'bg-red-50 border-red-300 text-red-700'
                    : k === 'ricorrenti' ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-brand-500/10 border-brand-300 text-brand-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}

          {/* Ultimo soggiorno filter */}
          <div className="relative">
            <select
              value={filtroUltimo}
              onChange={(e) => handleUltimoFilter(e.target.value as UltimoSoggiornoFilter)}
              className="appearance-none pl-8 pr-6 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <option value="">Ultimo soggiorno (tutti)</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 3 mesi</option>
              <option value="365">Ultimo anno</option>
            </select>
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Nazionalita filter */}
          {allNazionalita.length > 0 && (
            <div className="relative">
              <select
                value={filtroNazionalita}
                onChange={(e) => handleNazionalitaFilter(e.target.value)}
                className="appearance-none pl-8 pr-6 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <option value="">Tutte le nazionalità</option>
                {allNazionalita.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3 h-3" /> Azzera filtri
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400">{totale} ospiti</span>
        </div>

        {/* Tag multiselect */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            {allTags.map((tag) => {
              const active = filtroTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                    active ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        )}

        {/* Bulk actions bar */}
        {selezionatiCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-brand-50 border border-brand-200">
            <span className="text-sm font-semibold text-brand-700">{selezionatiCount} selezionati</span>
            <BulkTagInput onAdd={bulkAddTag} disabled={bulkBusy} />
            <button onClick={() => bulkSetVip(true)} disabled={bulkBusy} className="text-xs px-2.5 py-1.5 rounded-md bg-yellow-500 text-white font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> Imposta VIP
            </button>
            <button onClick={() => bulkSetVip(false)} disabled={bulkBusy} className="text-xs px-2.5 py-1.5 rounded-md bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 disabled:opacity-50">
              Rimuovi VIP
            </button>
            <button onClick={esportaCSV} disabled={bulkBusy} className="text-xs px-2.5 py-1.5 rounded-md bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> Esporta filtro
            </button>
            <button onClick={() => setSelezionati(new Set())} className="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700">
              Annulla selezione
            </button>
            {bulkBusy && <Loader2 className="w-4 h-4 animate-spin text-brand-500" />}
            {bulkError && <span className="text-xs text-red-600">{bulkError}</span>}
          </div>
        )}
      </div>

      {/* Tabella */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th w-8">
                  <button onClick={toggleSelezioneAll} className="p-1 text-gray-400 hover:text-brand-500">
                    {allSelectedInPage ? <CheckSquare className="w-4 h-4 text-brand-500" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="table-th">
                  <button onClick={() => handleSort('cognome')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Nome <SortIcon field="cognome" />
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
                    Speso <SortIcon field="totaleSpeso" />
                  </button>
                </th>
                <th className="table-th hidden xl:table-cell">
                  <button onClick={() => handleSort('dataUltimoSoggiorno')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Ultimo <SortIcon field="dataUltimoSoggiorno" />
                  </button>
                </th>
                <th className="table-th hidden md:table-cell">Tag</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {ospiti.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-gray-400 text-sm">
                    {hasFilters ? 'Nessun ospite corrisponde ai filtri' : 'Nessun ospite in CRM'}
                  </td>
                </tr>
              ) : (
                ospiti.map((o) => (
                  <tr key={o.id} className={`border-b border-gray-50 hover:bg-gray-50/60 group ${selezionati.has(o.id) ? 'bg-brand-50/40' : ''}`}>
                    <td className="table-td">
                      <button onClick={() => toggleSelezione(o.id)} className="p-1 text-gray-400 hover:text-brand-500">
                        {selezionati.has(o.id) ? <CheckSquare className="w-4 h-4 text-brand-500" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
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
                        {o.tags.slice(0, 3).map((t) => (
                          <button
                            key={t}
                            onClick={() => toggleTag(t)}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                              filtroTags.includes(t)
                                ? 'bg-brand-500 text-white'
                                : 'bg-brand-500/10 text-brand-700 hover:bg-brand-500/20'
                            }`}
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

      {/* Paginazione */}
      {pagine > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Righe:</span>
            {[10, 20, 50, 100].map((pp) => (
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

          <span className="text-xs text-gray-400">
            {Math.min((pagina - 1) * perPage + 1, totale)}–{Math.min(pagina * perPage, totale)} di {totale}
          </span>

          <div className="flex items-center gap-1">
            <button onClick={() => cambiaPagina(1)} disabled={pagina <= 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={() => cambiaPagina(pagina - 1)} disabled={pagina <= 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPageRange(pagina, pagine).map((p, idx) =>
              p === -1 ? (
                <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-300 text-xs">…</span>
              ) : (
                <button key={p} onClick={() => cambiaPagina(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    p === pagina ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {p}
                </button>
              ),
            )}

            <button onClick={() => cambiaPagina(pagina + 1)} disabled={pagina >= pagine}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => cambiaPagina(pagine)} disabled={pagina >= pagine}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {modalAperto && (
        <NuovoOspiteModal onClose={() => setModalAperto(false)} onCreato={onCreato} />
      )}
    </div>
  )
}

// ─── BulkTagInput ─────────────────────────────────────────────────────────────

function BulkTagInput({ onAdd, disabled }: { onAdd: (tag: string) => void; disabled: boolean }) {
  const [val, setVal] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) { onAdd(val); setVal('') } }} className="flex items-center gap-1">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Aggiungi tag…"
        disabled={disabled}
        className="text-xs px-2 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 w-32 disabled:opacity-50"
      />
      <button type="submit" disabled={disabled || !val.trim()} className="text-xs px-2 py-1.5 rounded-md bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1">
        <Tag className="w-3 h-3" /> Tag
      </button>
    </form>
  )
}

// ─── Page range helper ────────────────────────────────────────────────────────

function getPageRange(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: number[] = []
  pages.push(1)
  if (current > 3) pages.push(-1)
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push(-1)
  pages.push(total)
  return pages
}

// ─── Modal nuovo ospite ───────────────────────────────────────────────────────

function NuovoOspiteModal({
  onClose, onCreato,
}: {
  onClose: () => void
  onCreato: (o: OspiteRow) => void
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
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      }),
    })
    if (!res.ok) {
      const j = await res.json(); setErrore(j.error || 'Errore'); setLoading(false); return
    }
    const ospite = await res.json()
    onCreato({
      ...ospite,
      dataUltimoSoggiorno: ospite.dataUltimoSoggiorno ?? null,
      createdAt: ospite.createdAt ?? new Date().toISOString(),
    })
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
              <input type="text" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Cognome *</label>
              <input type="text" value={form.cognome} onChange={(e) => setForm((f) => ({ ...f, cognome: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefono</label>
              <input type="tel" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Nazionalità</label>
              <input type="text" value={form.nazionalita} onChange={(e) => setForm((f) => ({ ...f, nazionalita: e.target.value }))} className="input" placeholder="Italia, Francia…" />
            </div>
          </div>
          <div>
            <label className="label">Preferenze</label>
            <textarea rows={2} value={form.preferenze} onChange={(e) => setForm((f) => ({ ...f, preferenze: e.target.value }))} className="input" placeholder="piano alto, allergia noci…" />
          </div>
          <div>
            <label className="label">Note interne</label>
            <textarea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Tag (separati da virgola)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className="input" placeholder="famiglia, anniversario, gluten-free" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="vip" checked={form.vip} onChange={(e) => setForm((f) => ({ ...f, vip: e.target.checked }))} className="w-4 h-4 accent-yellow-500" />
            <label htmlFor="vip" className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Crown className="w-4 h-4 text-yellow-500" /> Ospite VIP
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Salvataggio…' : 'Crea ospite'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  )
}
