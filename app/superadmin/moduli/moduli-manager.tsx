'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Loader2, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Euro, Clock, Timer } from 'lucide-react'
import { CATALOGO_MODULI, parseModuli, parseModuliEsteso, type ModuloConfig, type ModuliAttivi, type ModuloStatoEsteso } from '@/lib/moduli'

type HostConModuli = {
  id: string
  nomeAzienda: string
  citta: string | null
  piano: string
  statoAbbonamento: string
  moduli: ModuliAttivi
  moduliRaw?: unknown
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
  initialSearchHost?: string
}

const CATEGORIA_LABEL: Record<string, string> = {
  base: 'Base',
  operativo: 'Operativo',
  avanzato: 'Avanzato',
  integrazioni: 'Integrazioni',
}

const CATEGORIA_COLORE: Record<string, string> = {
  base: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  operativo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  avanzato: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  integrazioni: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const STATO_COLORI: Record<string, string> = {
  ATTIVO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  IN_PROVA: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SOSPESO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SCADUTO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function ModuliManager({ hosts: hostsIniziali, stats, initialSearchHost }: Props) {
  const [search, setSearch] = useState(initialSearchHost ?? '')
  const [hosts, setHosts] = useState(hostsIniziali)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(initialSearchHost ? [] : []))
  const [saving, setSaving] = useState<Set<string>>(new Set())

  // Se ho un initialSearchHost, espando quel host di default
  useMemo(() => {
    if (initialSearchHost) {
      const found = hostsIniziali.find(h => h.nomeAzienda === initialSearchHost)
      if (found) setExpanded(new Set([found.id]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearchHost])

  const moduliPerCategoria = useMemo(() => {
    const g: Record<string, ModuloConfig[]> = { base: [], operativo: [], avanzato: [], integrazioni: [] }
    for (const m of CATALOGO_MODULI) g[m.categoria]?.push(m)
    return g
  }, [])

  const hostsFiltrati = useMemo(() => {
    if (!search.trim()) return hosts
    const q = search.toLowerCase()
    return hosts.filter(h =>
      h.nomeAzienda.toLowerCase().includes(q) ||
      (h.citta?.toLowerCase().includes(q) ?? false) ||
      h.piano.toLowerCase().includes(q)
    )
  }, [hosts, search])

  function toggleExpand(hostId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(hostId)) next.delete(hostId)
      else next.add(hostId)
      return next
    })
  }

  async function toggleModulo(hostId: string, moduloId: string, newValue: boolean) {
    const key = `${hostId}-${moduloId}`
    setSaving(prev => new Set(prev).add(key))

    // Optimistic
    const prevState = hosts.find(h => h.id === hostId)?.moduli[moduloId]
    setHosts(prev =>
      prev.map(h =>
        h.id === hostId ? { ...h, moduli: { ...h.moduli, [moduloId]: newValue } } : h
      )
    )

    try {
      const res = await fetch(`/api/superadmin/host/${hostId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduliAttivi: { [moduloId]: newValue } }),
      })

      if (!res.ok) {
        const err = await res.text().catch(() => 'errore sconosciuto')
        alert(`Errore: ${res.status} ${err.slice(0, 200)}`)
        // Rollback
        setHosts(prev =>
          prev.map(h =>
            h.id === hostId
              ? { ...h, moduli: { ...h.moduli, [moduloId]: prevState ?? false } }
              : h
          )
        )
      }
    } catch (err) {
      alert(`Errore rete: ${String(err).slice(0, 200)}`)
      setHosts(prev =>
        prev.map(h =>
          h.id === hostId
            ? { ...h, moduli: { ...h.moduli, [moduloId]: prevState ?? false } }
            : h
        )
      )
    } finally {
      setSaving(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  function getDemoInfo(hostId: string, moduloId: string): ModuloStatoEsteso | null {
    const host = hosts.find(h => h.id === hostId)
    if (!host?.moduliRaw || typeof host.moduliRaw !== 'object') return null
    const raw = host.moduliRaw as Record<string, unknown>
    const val = raw[moduloId]
    if (val && typeof val === 'object' && 'modalita' in (val as Record<string, unknown>)) {
      return val as ModuloStatoEsteso
    }
    return null
  }

  async function attivaDemo(hostId: string, moduloId: string, giorni: number) {
    const key = `${hostId}-${moduloId}`
    setSaving(prev => new Set(prev).add(key))

    const scadenza = new Date()
    scadenza.setDate(scadenza.getDate() + giorni)

    const demoValue: ModuloStatoEsteso = {
      attivo: true,
      modalita: 'demo',
      prezzo: 0,
      scadenzaDemo: scadenza.toISOString(),
    }

    // Optimistic
    setHosts(prev =>
      prev.map(h =>
        h.id === hostId
          ? {
              ...h,
              moduli: { ...h.moduli, [moduloId]: true },
              moduliRaw: { ...(typeof h.moduliRaw === 'object' ? h.moduliRaw : {}), [moduloId]: demoValue },
            }
          : h
      )
    )

    try {
      const res = await fetch(`/api/superadmin/host/${hostId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduliAttivi: { [moduloId]: demoValue } }),
      })
      if (!res.ok) alert('Errore attivazione demo')
    } catch {
      alert('Errore rete')
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  async function applicaPresetPiano(hostId: string) {
    // Al momento applica: niente — in futuro potrebbe resettare ai default piano
    if (!confirm('Reset moduli ai default del piano?')) return
    const host = hosts.find(h => h.id === hostId)
    if (!host) return

    // Reset: disattiva tutti i moduli non base
    const reset: Record<string, boolean> = {}
    for (const m of CATALOGO_MODULI) {
      reset[m.id] = m.categoria === 'base'
    }
    const res = await fetch(`/api/superadmin/host/${hostId}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduliAttivi: reset }),
    })
    if (res.ok) {
      setHosts(prev => prev.map(h => (h.id === hostId ? { ...h, moduli: reset } : h)))
      alert('Moduli ripristinati ai soli base.')
    } else {
      alert('Errore ripristino')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Gestione Moduli</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.totaleHost} host · {stats.totaleModuli} moduli nel catalogo
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox
          label="Host totali"
          value={stats.totaleHost}
          color="brand"
        />
        <StatBox
          label="Con moduli base completi"
          value={stats.hostsBaseCompleti}
          color="green"
        />
        <StatBox
          label="Modulo più usato"
          value={stats.piuUsato ? `${CATALOGO_MODULI.find(m => m.id === stats.piuUsato!.id)?.nome ?? stats.piuUsato.id} (${stats.piuUsato.count})` : '—'}
          color="blue"
        />
        <StatBox
          label="Modulo meno usato"
          value={stats.menoUsato ? `${CATALOGO_MODULI.find(m => m.id === stats.menoUsato!.id)?.nome ?? stats.menoUsato.id} (${stats.menoUsato.count})` : '—'}
          color="amber"
        />
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca host per nome, città o piano..."
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Host list */}
      <div className="space-y-2">
        {hostsFiltrati.length === 0 && (
          <div className="card py-12 text-center text-sm text-gray-400">
            Nessun host trovato.
          </div>
        )}

        {hostsFiltrati.map(host => {
          const isOpen = expanded.has(host.id)
          const moduliAttiviCount = Object.values(host.moduli).filter(v => v === true).length

          return (
            <div key={host.id} className="card overflow-hidden">
              {/* Row header */}
              <button
                onClick={() => toggleExpand(host.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                      {host.nomeAzienda}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        STATO_COLORI[host.statoAbbonamento] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {host.statoAbbonamento}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {host.citta ?? '—'} · {host.piano}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{moduliAttiviCount} moduli attivi</span>
                  <Link
                    href={`/superadmin/host/${host.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                  >
                    Dettaglio <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </button>

              {/* Expanded: checkbox per tutti i moduli */}
              {isOpen && (
                <div className="border-t border-gray-100 dark:border-slate-700 p-4 space-y-4 bg-gray-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Click per attivare/disattivare. Le modifiche vengono salvate subito.
                    </p>
                    <button
                      onClick={() => applicaPresetPiano(host.id)}
                      className="text-[11px] text-gray-500 hover:text-red-600 underline"
                    >
                      Reset a soli base
                    </button>
                  </div>

                  {Object.entries(moduliPerCategoria).map(([cat, moduli]) => (
                    <div key={cat}>
                      <p className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-2 ${CATEGORIA_COLORE[cat]}`}>
                        {CATEGORIA_LABEL[cat]}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {moduli.map(m => {
                          const key = `${host.id}-${m.id}`
                          const attivo = !!host.moduli[m.id]
                          const isSaving = saving.has(key)
                          const demoInfo = getDemoInfo(host.id, m.id)
                          const isDemo = demoInfo?.modalita === 'demo' && demoInfo.scadenzaDemo
                          const demoScadenza = isDemo ? new Date(demoInfo!.scadenzaDemo!) : null
                          const demoScaduto = demoScadenza ? demoScadenza < new Date() : false

                          return (
                            <div
                              key={m.id}
                              className={`flex items-start gap-2 p-2.5 rounded-lg border transition-all ${
                                isDemo && !demoScaduto
                                  ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                                  : attivo
                                  ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300'
                              } ${isSaving ? 'opacity-60' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={attivo && !demoScaduto}
                                disabled={isSaving}
                                onChange={e => toggleModulo(host.id, m.id, e.target.checked)}
                                className="mt-0.5 shrink-0 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate">
                                    {m.nome}
                                  </p>
                                  {isSaving && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                                  {attivo && !isSaving && !isDemo && <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />}
                                  {isDemo && !demoScaduto && (
                                    <span className="text-[9px] bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                      <Timer className="w-2.5 h-2.5" />
                                      DEMO — scade {demoScadenza!.toLocaleDateString('it-IT')}
                                    </span>
                                  )}
                                  {isDemo && demoScaduto && (
                                    <span className="text-[9px] bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-1.5 py-0.5 rounded font-bold">
                                      DEMO SCADUTA
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 line-clamp-2">{m.descrizione}</p>

                                {/* Bottone Demo — visibile solo se il modulo è OFF */}
                                {!attivo && !isDemo && (
                                  <div className="flex gap-1 mt-1.5">
                                    {[7, 14, 30].map(gg => (
                                      <button
                                        key={gg}
                                        type="button"
                                        onClick={() => attivaDemo(host.id, m.id, gg)}
                                        disabled={isSaving}
                                        className="text-[10px] px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-0.5 disabled:opacity-50"
                                      >
                                        <Clock className="w-2.5 h-2.5" /> {gg}gg
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  }
  return (
    <div className={`card ${colors[color]}`}>
      <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">{label}</p>
      <p className="text-lg font-bold mt-1 truncate">{value}</p>
    </div>
  )
}
