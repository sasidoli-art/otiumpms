'use client'

import { useState, useMemo } from 'react'
import { CATALOGO_MODULI, type ModuloConfig, parseModuliEsteso, PREZZI_ADDON, calcolaCanoneAddon, type ModuloStatoEsteso } from '@/lib/moduli'
import {
  BookOpen, Building2, Users, Sparkles, Wrench, ClipboardCheck, MessageSquare,
  Shield, Search, Boxes, AlertTriangle, Waves, CalendarDays, FileText, TrendingUp,
  UtensilsCrossed, ShoppingBag, Gift, CreditCard, Award, Clock, Banknote,
  Bot, Mail, CalendarRange, Globe, Package, ToggleLeft,
  ChevronRight, Loader2, Zap, Euro, Wifi, Handshake, LineChart, Coins,
} from 'lucide-react'



// ─── Tipi ────────────────────────────────────────────────────────────────────

interface HostConModuli {
  id: string
  nomeAzienda: string
  citta: string | null
  piano: string
  statoAbbonamento: string
  moduli: Record<string, boolean>
  moduliRaw?: unknown // raw JSON from DB for parseModuliEsteso
}

interface Props {
  hosts: HostConModuli[]
  usageStats: Record<string, number>
  stats: {
    totaleModuli: number
    piuUsato: { id: string; count: number } | null
    menoUsato: { id: string; count: number } | null
    hostsBaseCompleti: number
    totaleHost: number
  }
  initialSearchHost?: string // quando si arriva da /superadmin/strutture con ?host=<id>
}

// ─── Icona helper ────────────────────────────────────────────────────────────

const ICONE: Record<string, React.ElementType> = {
  BookOpen, Building2, Users, Sparkles, Wrench, ClipboardCheck, MessageSquare,
  Shield, Search, Boxes, AlertTriangle, Waves, CalendarDays, FileText, TrendingUp,
  UtensilsCrossed, ShoppingBag, Gift, CreditCard, Award, Clock, Banknote,
  Bot, Mail, CalendarRange, Globe, Wifi, Handshake, LineChart, Coins,
}

function ModuloIcona({ nome, className }: { nome: string; className?: string }) {
  const Icon = ICONE[nome] || Package
  return <Icon className={className} />
}

// ─── Badge categoria ─────────────────────────────────────────────────────────

const CATEGORIA_COLORI: Record<string, string> = {
  base: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  operativo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  avanzato: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  integrazioni: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const CATEGORIA_LABEL: Record<string, string> = {
  base: 'Base',
  operativo: 'Operativo',
  avanzato: 'Avanzato',
  integrazioni: 'Integrazioni',
}

const STATO_COLORI: Record<string, string> = {
  ATTIVO: 'bg-green-100 text-green-700',
  IN_PROVA: 'bg-blue-100 text-blue-700',
  SOSPESO: 'bg-amber-100 text-amber-700',
  SCADUTO: 'bg-red-100 text-red-700',
}

// ─── Componente principale ───────────────────────────────────────────────────

export function ModuliManager({ hosts, usageStats, stats, initialSearchHost }: Props) {
  const [selectedModulo, setSelectedModulo] = useState<string | null>(null)
  const [searchHost, setSearchHost] = useState(initialSearchHost ?? '')
  const [loadingToggles, setLoadingToggles] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [localHosts, setLocalHosts] = useState(hosts)

  // Stato esteso moduli per ogni host
  const [localModuliEsteso, setLocalModuliEsteso] = useState<Record<string, Record<string, ModuloStatoEsteso>>>(() => {
    const map: Record<string, Record<string, ModuloStatoEsteso>> = {}
    for (const h of hosts) {
      map[h.id] = parseModuliEsteso(h.moduliRaw)
    }
    return map
  })

  // Revenue add-on mensile totale
  const revenueMensile = useMemo(() => {
    let totale = 0
    for (const hostModuli of Object.values(localModuliEsteso)) {
      for (const m of Object.values(hostModuli)) {
        if (m.modalita === 'pagamento' && m.prezzo > 0) {
          totale += m.prezzo
        }
      }
    }
    return totale
  }, [localModuliEsteso])

  // Conteggio breakdown per modulo: inclusi, demo, pagamento
  const conteggioPerModulo = useMemo(() => {
    const result: Record<string, { inclusi: number; demo: number; pagamento: number }> = {}
    for (const m of CATALOGO_MODULI) {
      result[m.id] = { inclusi: 0, demo: 0, pagamento: 0 }
    }
    for (const hostModuli of Object.values(localModuliEsteso)) {
      for (const [moduloId, stato] of Object.entries(hostModuli)) {
        if (!result[moduloId]) continue
        if (stato.modalita === 'incluso') result[moduloId].inclusi++
        else if (stato.modalita === 'demo') result[moduloId].demo++
        else if (stato.modalita === 'pagamento') result[moduloId].pagamento++
      }
    }
    return result
  }, [localModuliEsteso])

  // Raggruppa moduli per categoria
  const moduliPerCategoria = useMemo(() => {
    const grouped: Record<string, ModuloConfig[]> = {}
    for (const m of CATALOGO_MODULI) {
      if (!grouped[m.categoria]) grouped[m.categoria] = []
      grouped[m.categoria].push(m)
    }
    return grouped
  }, [])

  const selectedModuloConfig = useMemo(
    () => CATALOGO_MODULI.find(m => m.id === selectedModulo),
    [selectedModulo]
  )

  // Host filtrati
  const hostsFiltrati = useMemo(() => {
    if (!searchHost.trim()) return localHosts
    const q = searchHost.toLowerCase()
    return localHosts.filter(h =>
      h.nomeAzienda.toLowerCase().includes(q) ||
      (h.citta && h.citta.toLowerCase().includes(q))
    )
  }, [localHosts, searchHost])

  // Modulo più/meno usato nome
  const nomeModulo = (id: string) => CATALOGO_MODULI.find(m => m.id === id)?.nome ?? id

  // ─── Cambia stato modulo per singolo host ──────────────────────────────────

  async function cambiaStatoModulo(hostId: string, moduloId: string, stato: ModuloStatoEsteso) {
    const key = `${hostId}-${moduloId}`
    setLoadingToggles(prev => new Set(prev).add(key))

    try {
      const res = await fetch(`/api/superadmin/host/${hostId}/moduli`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduli: { [moduloId]: stato } }),
      })

      if (res.ok) {
        // Aggiorna stato locale (sia booleano legacy che esteso)
        setLocalHosts(prev => prev.map(h =>
          h.id === hostId
            ? { ...h, moduli: { ...h.moduli, [moduloId]: stato.attivo } }
            : h
        ))
        setLocalModuliEsteso(prev => ({
          ...prev,
          [hostId]: {
            ...prev[hostId],
            [moduloId]: stato,
          },
        }))
      }
    } finally {
      setLoadingToggles(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  // ─── Bulk azione ──────────────────────────────────────────────────────────

  async function bulkAction(moduloId: string, attivo: boolean) {
    if (!confirm(
      attivo
        ? `Attivare "${nomeModulo(moduloId)}" per TUTTI gli host?`
        : `Disattivare "${nomeModulo(moduloId)}" per TUTTI gli host?`
    )) return

    setBulkLoading(true)
    try {
      const res = await fetch('/api/superadmin/moduli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduloId, attivo }),
      })

      if (res.ok) {
        setLocalHosts(prev => prev.map(h => ({
          ...h,
          moduli: { ...h.moduli, [moduloId]: attivo },
        })))
        // Aggiorna anche lo stato esteso per mantenere la UI allineata
        setLocalModuliEsteso(prev => {
          const next: typeof prev = {}
          for (const [hostId, moduli] of Object.entries(prev)) {
            const prec = moduli[moduloId]
            next[hostId] = {
              ...moduli,
              [moduloId]: {
                attivo,
                modalita: attivo ? (prec?.modalita ?? 'incluso') : 'off',
                prezzo: attivo ? (prec?.prezzo ?? 0) : 0,
                scadenzaDemo: attivo ? prec?.scadenzaDemo : undefined,
              },
            }
          }
          return next
        })
      }
    } finally {
      setBulkLoading(false)
    }
  }

  // ─── Contatori per modulo selezionato ─────────────────────────────────────

  const conteggioAttivo = useMemo(() => {
    if (!selectedModulo) return { attivi: 0, inattivi: 0, demo: 0, pagamento: 0 }
    let demo = 0, pagamento = 0, attivi = 0
    for (const h of localHosts) {
      const stato = localModuliEsteso[h.id]?.[selectedModulo]
      if (!stato || stato.modalita === 'off') continue
      attivi++
      if (stato.modalita === 'demo') demo++
      if (stato.modalita === 'pagamento') pagamento++
    }
    return { attivi, inattivi: localHosts.length - attivi, demo, pagamento }
  }, [selectedModulo, localHosts, localModuliEsteso])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Gestione Moduli {/* TODO: i18n */}
        </h1>
        <p className="text-sm text-gray-500">
          Attiva o disattiva funzionalità per ogni host {/* TODO: i18n */}
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-gray-900 dark:text-slate-100">{stats.totaleModuli}</p>
            <p className="text-xs text-gray-500">Moduli disponibili</p>{/* TODO: i18n */}
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-gray-900 dark:text-slate-100">
              {stats.piuUsato ? nomeModulo(stats.piuUsato.id) : '—'}
            </p>
            <p className="text-xs text-gray-500">
              Più popolare ({stats.piuUsato?.count ?? 0} host) {/* TODO: i18n */}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-gray-900 dark:text-slate-100">
              {stats.menoUsato ? nomeModulo(stats.menoUsato.id) : '—'}
            </p>
            <p className="text-xs text-gray-500">
              Meno usato ({stats.menoUsato?.count ?? 0} host) {/* TODO: i18n */}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-gray-900 dark:text-slate-100">
              {stats.hostsBaseCompleti}/{stats.totaleHost}
            </p>
            <p className="text-xs text-gray-500">Host con base completi</p>{/* TODO: i18n */}
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Euro className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-gray-900 dark:text-slate-100">
              {revenueMensile.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">Revenue add-on mensile</p>{/* TODO: i18n */}
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Catalogo moduli */}
        <div className="lg:col-span-2 space-y-4">
          {(['base', 'operativo', 'avanzato', 'integrazioni'] as const).map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {CATEGORIA_LABEL[cat]}
              </h3>
              <div className="space-y-2">
                {(moduliPerCategoria[cat] || []).map(m => {
                  const isSelected = selectedModulo === m.id
                  const count = usageStats[m.id] ?? 0
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModulo(isSelected ? null : m.id)}
                      className={`w-full text-left card p-3 flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-brand-500 bg-brand-50/50 dark:bg-brand-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-gray-100 dark:bg-slate-800'
                      }`}>
                        <ModuloIcona nome={m.icona} className={`w-4 h-4 ${
                          isSelected ? 'text-brand-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                            {m.nome}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORIA_COLORI[m.categoria]}`}>
                            {CATEGORIA_LABEL[m.categoria]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{m.descrizione}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {conteggioPerModulo[m.id]?.inclusi > 0 && (
                            <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1 py-0.5 rounded">{conteggioPerModulo[m.id].inclusi} incl</span>
                          )}
                          {conteggioPerModulo[m.id]?.demo > 0 && (
                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 py-0.5 rounded">{conteggioPerModulo[m.id].demo} demo</span>
                          )}
                          {conteggioPerModulo[m.id]?.pagamento > 0 && (
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1 py-0.5 rounded">{conteggioPerModulo[m.id].pagamento} paid</span>
                          )}
                          {count === 0 && (
                            <span className="text-gray-400">0 host</span>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${
                          isSelected ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Host assignment */}
        <div className="lg:col-span-3">
          {!selectedModulo ? (
            <div className="card py-16 flex flex-col items-center gap-3 text-gray-300 dark:text-slate-600">
              <ToggleLeft className="w-12 h-12" />
              <p className="text-sm">Seleziona un modulo per gestire le attivazioni</p>{/* TODO: i18n */}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Module header + bulk actions */}
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                      <ModuloIcona
                        nome={selectedModuloConfig?.icona ?? ''}
                        className="w-5 h-5 text-brand-600"
                      />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        {selectedModuloConfig?.nome}
                      </h2>
                      <p className="text-xs text-gray-500">{selectedModuloConfig?.descrizione}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-green-600 font-medium">{conteggioAttivo.attivi} attivi</span>
                    {conteggioAttivo.demo > 0 && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-amber-600">{conteggioAttivo.demo} demo</span>
                      </>
                    )}
                    {conteggioAttivo.pagamento > 0 && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-blue-600">{conteggioAttivo.pagamento} paid</span>
                      </>
                    )}
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-400">{conteggioAttivo.inattivi} off</span>
                  </div>
                </div>

                {/* Bulk actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button
                    onClick={() => bulkAction(selectedModulo, true)}
                    disabled={bulkLoading}
                    className="btn-sm bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50 flex items-center gap-1"
                  >
                    {bulkLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    Attiva per tutti gli host {/* TODO: i18n */}
                  </button>
                  <button
                    onClick={() => bulkAction(selectedModulo, false)}
                    disabled={bulkLoading}
                    className="btn-sm bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50 flex items-center gap-1"
                  >
                    {bulkLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    Disattiva per tutti {/* TODO: i18n */}
                  </button>
                </div>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Cerca host per nome o città..." /* TODO: i18n */
                value={searchHost}
                onChange={e => setSearchHost(e.target.value)}
                className="input w-full"
              />

              {/* Host list */}
              <div className="card divide-y divide-gray-100 dark:divide-slate-700">
                {hostsFiltrati.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    Nessun host trovato {/* TODO: i18n */}
                  </div>
                ) : (
                  hostsFiltrati.map(h => {
                    const toggleKey = `${h.id}-${selectedModulo}`
                    const isLoading = loadingToggles.has(toggleKey)
                    const statoEsteso = localModuliEsteso[h.id]?.[selectedModulo] ?? { attivo: false, modalita: 'off' as const, prezzo: 0 }
                    const modalita = statoEsteso.modalita
                    const prezzoDefault = PREZZI_ADDON[selectedModulo] ?? 10

                    return (
                      <div key={h.id} className="py-3 px-1 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                                {h.nomeAzienda}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400">{h.citta || '—'}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  STATO_COLORI[h.statoAbbonamento] || 'bg-gray-100 text-gray-600'
                                }`}>
                                  {h.statoAbbonamento}
                                </span>
                                <span className="text-[10px] bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 px-1.5 py-0.5 rounded">
                                  {h.piano}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 3-state selector */}
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 text-gray-300 animate-spin flex-shrink-0 ml-4" />
                          ) : (
                            <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                              <button
                                onClick={() => cambiaStatoModulo(h.id, selectedModulo, { attivo: false, modalita: 'off', prezzo: 0 })}
                                className={`text-[11px] px-2 py-1 rounded-l-md border transition-colors ${
                                  modalita === 'off'
                                    ? 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-500 font-semibold'
                                    : 'bg-white dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                                title="Disattivato"
                              >
                                Off
                              </button>
                              <button
                                onClick={() => cambiaStatoModulo(h.id, selectedModulo, { attivo: true, modalita: 'demo', prezzo: 0 })}
                                className={`text-[11px] px-2 py-1 border-y transition-colors ${
                                  modalita === 'demo'
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 font-semibold'
                                    : 'bg-white dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-green-900/20'
                                }`}
                                title="Demo gratuito"
                              >
                                Demo
                              </button>
                              <button
                                onClick={() => cambiaStatoModulo(h.id, selectedModulo, { attivo: true, modalita: 'pagamento', prezzo: statoEsteso.prezzo || prezzoDefault })}
                                className={`text-[11px] px-2 py-1 rounded-r-md border transition-colors ${
                                  modalita === 'pagamento'
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 font-semibold'
                                    : 'bg-white dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                }`}
                                title="A pagamento"
                              >
                                {modalita === 'pagamento' ? `${statoEsteso.prezzo}` : `${prezzoDefault}`}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Extra fields for demo/pagamento */}
                        {modalita === 'demo' && (
                          <div className="mt-2 ml-0 flex items-center gap-2">
                            <label className="text-[10px] text-gray-400">Scadenza demo:</label>
                            <input
                              type="date"
                              value={statoEsteso.scadenzaDemo?.slice(0, 10) ?? ''}
                              onChange={e => {
                                const nuovoStato: ModuloStatoEsteso = {
                                  ...statoEsteso,
                                  scadenzaDemo: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                }
                                cambiaStatoModulo(h.id, selectedModulo, nuovoStato)
                              }}
                              className="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                            />
                          </div>
                        )}
                        {modalita === 'pagamento' && (
                          <div className="mt-2 ml-0 flex items-center gap-2">
                            <label className="text-[10px] text-gray-400">Prezzo mensile:</label>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-gray-400">EUR</span>
                              <input
                                type="number"
                                min={0}
                                step={5}
                                value={statoEsteso.prezzo}
                                onChange={e => {
                                  const nuovoPrezzo = parseFloat(e.target.value) || 0
                                  // Update locally immediately, debounce API call until blur
                                  setLocalModuliEsteso(prev => ({
                                    ...prev,
                                    [h.id]: {
                                      ...prev[h.id],
                                      [selectedModulo]: {
                                        ...prev[h.id]?.[selectedModulo],
                                        prezzo: nuovoPrezzo,
                                      } as ModuloStatoEsteso,
                                    },
                                  }))
                                }}
                                onBlur={() => {
                                  // Legge lo stato fresco dal state, non dalla closure
                                  setLocalModuliEsteso(current => {
                                    const fresh = current[h.id]?.[selectedModulo]
                                    if (fresh) cambiaStatoModulo(h.id, selectedModulo, fresh)
                                    return current
                                  })
                                }}
                                className="w-16 text-[11px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                              />
                              <span className="text-[10px] text-gray-400">/mese</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
