'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import {
  Sparkles, Play, Check, AlertTriangle, Loader2,
  Filter, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

type StatoHK = 'PULITA' | 'SPORCA' | 'IN_PULIZIA' | 'NON_DISTURBARE' | 'MANUTENZIONE' | 'FUORI_SERVIZIO'
type Priorita = 'BASSA' | 'NORMALE' | 'ALTA' | 'URGENTE'

interface TaskInfo {
  id: string
  tipo: string
  descrizione: string | null
  priorita: Priorita
  note: string | null
  assegnatoA: string | null
  dataScadenza: string | null
}

interface PrenotazioneInfo {
  guestNome: string
  guestCognome: string
  dataArrivo: string
  dataPartenza: string | null
}

export interface HKUnita {
  id: string
  nome: string
  piano: number | null
  statoHK: StatoHK
  noteHK: string | null
  ultimaPulizia: string | null
  tasks: TaskInfo[]
  prenotazioneAttuale: PrenotazioneInfo | null
  arrivoOggi: PrenotazioneInfo | null
  partenzaOggi: PrenotazioneInfo | null
}

interface Props {
  unita: HKUnita[]
  onRefresh: () => void
  loading?: boolean
  operatoreNome?: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATO_CONFIG: Record<StatoHK, { label: string; color: string; bg: string }> = {
  SPORCA:          { label: 'Sporca',       color: 'bg-red-500',    bg: 'border-l-red-500' },
  IN_PULIZIA:      { label: 'In pulizia',   color: 'bg-amber-500',  bg: 'border-l-amber-500' },
  PULITA:          { label: 'Pulita',        color: 'bg-emerald-500', bg: 'border-l-emerald-500' },
  NON_DISTURBARE:  { label: 'Non disturb.',  color: 'bg-blue-500',   bg: 'border-l-blue-500' },
  MANUTENZIONE:    { label: 'Manutenzione', color: 'bg-violet-500', bg: 'border-l-violet-500' },
  FUORI_SERVIZIO:  { label: 'Fuori servizio', color: 'bg-slate-400', bg: 'border-l-slate-400' },
}

const PRIORITA_ORDER: Record<Priorita, number> = { URGENTE: 0, ALTA: 1, NORMALE: 2, BASSA: 3 }

// ─── Component ──────────────────────────────────────────────────────────────

export function HKTaskList({ unita: unitaList, onRefresh, loading, operatoreNome }: Props) {
  const [filtroStato, setFiltroStato] = useState<'tutte' | 'sporca' | 'in_pulizia' | 'urgenti'>('tutte')
  const [filtroPiano, setFiltroPiano] = useState<number | null>(null)
  const [optimistic, setOptimistic] = useState<Record<string, StatoHK>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Pull to refresh state
  const [pulling, setPulling] = useState(false)
  const [pullY, setPullY] = useState(0)
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get unique piani
  const piani = useMemo(() => {
    const set = new Set<number>()
    for (const u of unitaList) if (u.piano != null) set.add(u.piano)
    return Array.from(set).sort((a, b) => a - b)
  }, [unitaList])

  // Apply optimistic updates
  const unitaWithOptimistic = useMemo(() =>
    unitaList.map(u => ({
      ...u,
      statoHK: optimistic[u.id] ?? u.statoHK,
    })),
  [unitaList, optimistic])

  // Filter + sort
  const filtered = useMemo(() => {
    const oggi = new Date().toISOString().slice(0, 10)
    let list = unitaWithOptimistic

    if (filtroStato === 'sporca') list = list.filter(u => u.statoHK === 'SPORCA')
    else if (filtroStato === 'in_pulizia') list = list.filter(u => u.statoHK === 'IN_PULIZIA')
    else if (filtroStato === 'urgenti') list = list.filter(u =>
      u.tasks.some(t => t.priorita === 'URGENTE' || t.priorita === 'ALTA') || u.statoHK === 'SPORCA')

    if (filtroPiano !== null) list = list.filter(u => u.piano === filtroPiano)

    return list.sort((a, b) => {
      // Priority: highest task priority
      const prioA = Math.min(...(a.tasks.map(t => PRIORITA_ORDER[t.priorita]) || [2]))
      const prioB = Math.min(...(b.tasks.map(t => PRIORITA_ORDER[t.priorita]) || [2]))
      if (prioA !== prioB) return prioA - prioB

      // Departures today first
      const depA = a.partenzaOggi ? 0 : 1
      const depB = b.partenzaOggi ? 0 : 1
      if (depA !== depB) return depA - depB

      // Arrivals today next
      const arrA = a.arrivoOggi ? 0 : 1
      const arrB = b.arrivoOggi ? 0 : 1
      if (arrA !== arrB) return arrA - arrB

      // Dirty before clean
      const statoOrder: Record<string, number> = { SPORCA: 0, IN_PULIZIA: 1, MANUTENZIONE: 2, FUORI_SERVIZIO: 3, NON_DISTURBARE: 4, PULITA: 5 }
      return (statoOrder[a.statoHK] ?? 5) - (statoOrder[b.statoHK] ?? 5)
    })
  }, [unitaWithOptimistic, filtroStato, filtroPiano])

  const countDaFare = unitaWithOptimistic.filter(u => u.statoHK === 'SPORCA' || u.statoHK === 'IN_PULIZIA').length
  const allClean = countDaFare === 0 && unitaList.length > 0

  // ── Change stato ──
  const cambiaStato = useCallback(async (unitaId: string, nuovoStato: StatoHK) => {
    setActionLoading(unitaId)
    setOptimistic(prev => ({ ...prev, [unitaId]: nuovoStato }))

    // Haptic feedback
    try { navigator.vibrate?.(50) } catch {}

    try {
      const res = await fetch(`/api/host/housekeeping/unita/${unitaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statoHK: nuovoStato,
          ...(operatoreNome && { noteHK: `Ultimo: ${operatoreNome}` }),
        }),
      })
      if (!res.ok) {
        // Rollback
        setOptimistic(prev => { const n = { ...prev }; delete n[unitaId]; return n })
      }
    } catch {
      setOptimistic(prev => { const n = { ...prev }; delete n[unitaId]; return n })
    }
    setActionLoading(null)
  }, [operatoreNome])

  // ── Pull to refresh ──
  function onTouchStart(e: React.TouchEvent) {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchStartY.current) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0 && dy < 120) {
      setPullY(dy)
      setPulling(dy > 60)
    }
  }

  function onTouchEnd() {
    if (pulling) {
      onRefresh()
    }
    setPullY(0)
    setPulling(false)
    touchStartY.current = 0
  }

  // ── Swipe handler for individual cards ──
  function SwipeCard({ u, children }: { u: HKUnita; children: React.ReactNode }) {
    const startX = useRef(0)
    const [dx, setDx] = useState(0)

    return (
      <div
        className="relative overflow-hidden rounded-xl"
        onTouchStart={e => { startX.current = e.touches[0].clientX; setDx(0) }}
        onTouchMove={e => {
          const delta = e.touches[0].clientX - startX.current
          if (Math.abs(delta) > 10) setDx(delta)
        }}
        onTouchEnd={() => {
          if (dx > 80 && u.statoHK === 'SPORCA') cambiaStato(u.id, 'IN_PULIZIA')
          else if (dx < -80 && u.statoHK === 'IN_PULIZIA') cambiaStato(u.id, 'PULITA')
          setDx(0)
          startX.current = 0
        }}
      >
        {/* Swipe backgrounds */}
        {dx > 20 && u.statoHK === 'SPORCA' && (
          <div className="absolute inset-y-0 left-0 w-full bg-amber-500 flex items-center px-4">
            <span className="text-white text-sm font-semibold">Inizia pulizia</span>
          </div>
        )}
        {dx < -20 && u.statoHK === 'IN_PULIZIA' && (
          <div className="absolute inset-y-0 right-0 w-full bg-emerald-500 flex items-center justify-end px-4">
            <span className="text-white text-sm font-semibold">Segna pulita</span>
          </div>
        )}
        <div
          className="relative bg-white dark:bg-slate-900"
          style={{ transform: `translateX(${Math.max(-100, Math.min(100, dx))}px)`, transition: dx === 0 ? 'transform 200ms' : 'none' }}
        >
          {children}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════

  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-3">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            Housekeeping
          </h1>
          <p className="text-sm text-slate-500 capitalize">{oggi}</p>
        </div>
        <div className="flex items-center gap-2">
          {countDaFare > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">
              {countDaFare} da fare
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ═══ Filters ═══ */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([
            { id: 'tutte', label: 'Tutte' },
            { id: 'sporca', label: 'Da pulire' },
            { id: 'in_pulizia', label: 'In corso' },
            { id: 'urgenti', label: 'Urgenti' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFiltroStato(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filtroStato === f.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {piani.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFiltroPiano(null)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                filtroPiano === null
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              <Filter size={10} className="inline mr-1" />Tutti i piani
            </button>
            {piani.map(p => (
              <button
                key={p}
                onClick={() => setFiltroPiano(filtroPiano === p ? null : p)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  filtroPiano === p
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                Piano {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Pull to refresh indicator ═══ */}
      {pullY > 10 && (
        <div className="flex justify-center" style={{ height: pullY * 0.4 }}>
          <Loader2 size={18} className={cn('text-slate-400', pulling && 'animate-spin')} />
        </div>
      )}

      {/* ═══ Task list ═══ */}
      <div
        ref={containerRef}
        className="space-y-2 pb-20"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {allClean && filtroStato === 'tutte' ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <Check size={28} className="text-emerald-600" />
            </div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">Tutte le camere sono pulite!</p>
            <p className="text-sm text-slate-400 mt-1">Ottimo lavoro.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">Nessuna camera con questo filtro</p>
          </div>
        ) : (
          filtered.map(u => {
            const cfg = STATO_CONFIG[u.statoHK]
            const highPrio = u.tasks.find(t => t.priorita === 'URGENTE' || t.priorita === 'ALTA')
            const isLoading = actionLoading === u.id

            return (
              <SwipeCard key={u.id} u={u}>
                <div className={cn(
                  'flex items-center gap-3 px-3 py-3 border-l-4 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[72px]',
                  cfg.bg,
                )}>
                  {/* Status badge */}
                  <div className="flex flex-col items-center gap-1 shrink-0 w-14">
                    <div className={cn('w-3 h-3 rounded-full', cfg.color)} />
                    <span className="text-[9px] font-bold text-slate-500 text-center leading-tight">
                      {cfg.label}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">{u.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {u.piano != null && (
                        <span className="text-xs text-slate-400">Piano {u.piano}</span>
                      )}
                      {u.partenzaOggi && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Partenza: {u.partenzaOggi.guestCognome}
                        </span>
                      )}
                      {u.arrivoOggi && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Arrivo: {u.arrivoOggi.guestCognome}
                        </span>
                      )}
                      {highPrio && (
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded',
                          highPrio.priorita === 'URGENTE'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                        )}>
                          <AlertTriangle size={10} className="inline mr-0.5" />
                          {highPrio.priorita === 'URGENTE' ? 'Urgente' : 'Priorità alta'}
                        </span>
                      )}
                    </div>
                    {u.noteHK && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{u.noteHK}</p>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="shrink-0">
                    {isLoading ? (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                        <Loader2 size={16} className="animate-spin text-slate-400" />
                      </div>
                    ) : u.statoHK === 'SPORCA' ? (
                      <button
                        onClick={() => cambiaStato(u.id, 'IN_PULIZIA')}
                        className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors active:scale-95"
                        title="Inizia pulizia"
                      >
                        <Play size={18} />
                      </button>
                    ) : u.statoHK === 'IN_PULIZIA' ? (
                      <button
                        onClick={() => cambiaStato(u.id, 'PULITA')}
                        className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors active:scale-95"
                        title="Segna pulita"
                      >
                        <Check size={18} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </SwipeCard>
            )
          })
        )}
      </div>
    </div>
  )
}
