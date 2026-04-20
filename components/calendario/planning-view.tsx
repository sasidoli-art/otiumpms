'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { format, addDays, differenceInCalendarDays, isToday, isWeekend } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, CalendarDays, Loader2, X, Users, Tag,
  Clock, MapPin, ExternalLink,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type StatoHK = 'PULITA' | 'SPORCA' | 'IN_PULIZIA' | 'DA_VERIFICARE' | 'MANUTENZIONE'
type StatoPren = 'CONFERMATA' | 'RICHIESTA' | 'NO_SHOW' | 'COMPLETATA' | 'ANNULLATA'

type Unita = {
  id: string
  nome: string
  piano: number | null
  statoHK: StatoHK
  capacita: number
  strutturaId: string
  strutturaNome: string
}

type Prenotazione = {
  id: string
  unitaId: string | null
  guestNome: string
  guestCognome: string
  dataArrivo: string
  dataPartenza: string | null
  stato: StatoPren
  fonte: string | null
  numOspiti: number
  statoCheckIn: string
}

type Blocco = {
  id: string
  unitaId: string
  dataInizio: string
  dataFine: string
  canaleNome: string
  canaleColore: string
  sommario: string
}

type TariffaPeriodo = {
  id: string
  unitaId: string
  nome: string
  prezzo: number
  dataInizio: string
  dataFine: string
  colore: string | null
}

type Chiusura = { unitaId: string; data: string }

type CalData = {
  unita: Unita[]
  prenotazioni: Prenotazione[]
  blocchiOTA: Blocco[]
  tariffe: TariffaPeriodo[]
  chiusure: Chiusura[]
  canaliLegend: { nome: string; colore: string }[]
}

// ─── Utils ──────────────────────────────────────────────────────────────────

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
function parseYMD(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

const STATO_BADGE: Record<StatoPren, { bg: string; text: string; label: string }> = {
  CONFERMATA: { bg: 'bg-indigo-500', text: 'text-white', label: 'Confermata' },
  RICHIESTA: { bg: 'bg-amber-400', text: 'text-amber-950', label: 'Richiesta' },
  NO_SHOW: { bg: 'bg-red-500', text: 'text-white', label: 'No show' },
  COMPLETATA: { bg: 'bg-emerald-500', text: 'text-white', label: 'Completata' },
  ANNULLATA: { bg: 'bg-gray-400', text: 'text-white', label: 'Annullata' },
}

const HK_DOT: Record<StatoHK, string> = {
  PULITA: 'bg-emerald-500',
  SPORCA: 'bg-red-500',
  IN_PULIZIA: 'bg-amber-500',
  DA_VERIFICARE: 'bg-yellow-400',
  MANUTENZIONE: 'bg-purple-500',
}

// ─── Main ───────────────────────────────────────────────────────────────────

type Props = {
  strutturaId: string | null
}

type RangeMode = '14' | '30' | '90'

export default function PlanningView({ strutturaId }: Props) {
  const [start, setStart] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [giorniTotali, setGiorniTotali] = useState<number>(14)
  const [rangeMode, setRangeMode] = useState<RangeMode>('14')
  const [data, setData] = useState<CalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [filterPiano, setFilterPiano] = useState<string>('')
  const [showSoloSporche, setShowSoloSporche] = useState(false)
  const [showPrezzi, setShowPrezzi] = useState(false)
  const [prenotazioneOpen, setPrenotazioneOpen] = useState<Prenotazione | null>(null)
  const [cellOpen, setCellOpen] = useState<{ unita: Unita; data: Date } | null>(null)

  const end = useMemo(() => addDays(start, giorniTotali), [start, giorniTotali])

  const load = useCallback(async () => {
    setLoading(true)
    setErrore(null)
    try {
      const params = new URLSearchParams({ da: ymd(start), a: ymd(end) })
      if (strutturaId) params.set('strutturaId', strutturaId)
      const res = await fetch(`/api/host/calendario?${params}`)
      const body = await res.json()
      if (!res.ok) {
        setErrore(body.error ?? 'Errore caricamento')
        setData(null)
      } else {
        setData(body)
      }
    } catch {
      setErrore('Errore di rete')
    } finally {
      setLoading(false)
    }
  }, [start, end, strutturaId])

  useEffect(() => { void load() }, [load])

  // Days array
  const giorni = useMemo(() => {
    const out: Date[] = []
    for (let i = 0; i < giorniTotali; i++) out.push(addDays(start, i))
    return out
  }, [start, giorniTotali])

  // Piani disponibili
  const piani = useMemo(() => {
    if (!data) return [] as number[]
    const s = new Set<number>()
    for (const u of data.unita) if (u.piano !== null) s.add(u.piano)
    return [...s].sort((a, b) => a - b)
  }, [data])

  // Unità filtrate
  const unitaVisibili = useMemo(() => {
    if (!data) return []
    return data.unita.filter((u) => {
      if (filterPiano !== '' && String(u.piano) !== filterPiano) return false
      if (showSoloSporche && u.statoHK !== 'SPORCA') return false
      return true
    })
  }, [data, filterPiano, showSoloSporche])

  // Raggruppate per struttura → piano
  const unitaRaggruppate = useMemo(() => {
    const byStruttura = new Map<string, { nome: string; perPiano: Map<number | 'nolvl', Unita[]> }>()
    for (const u of unitaVisibili) {
      const key = u.strutturaId
      if (!byStruttura.has(key)) byStruttura.set(key, { nome: u.strutturaNome, perPiano: new Map() })
      const group = byStruttura.get(key)!
      const pk: number | 'nolvl' = u.piano ?? 'nolvl'
      if (!group.perPiano.has(pk)) group.perPiano.set(pk, [])
      group.perPiano.get(pk)!.push(u)
    }
    return byStruttura
  }, [unitaVisibili])

  // Range nav
  function setRange(m: RangeMode) {
    setRangeMode(m)
    setGiorniTotali(m === '14' ? 14 : m === '30' ? 30 : 90)
  }
  function next() { setStart(addDays(start, 7)) }
  function prev() { setStart(addDays(start, -7)) }
  function oggi() {
    const d = new Date(); d.setHours(0, 0, 0, 0)
    setStart(d)
  }

  // Tariffa di un giorno (prendi la prima matchante per la unità)
  function tariffaGiorno(unitaId: string, d: Date): TariffaPeriodo | null {
    if (!data) return null
    const k = ymd(d)
    return data.tariffe.find(
      (t) => t.unitaId === unitaId && ymd(parseYMD(t.dataInizio)) <= k && ymd(parseYMD(t.dataFine)) >= k,
    ) ?? null
  }

  // Prenotazioni per unità
  function prenotazioniUnita(unitaId: string): Prenotazione[] {
    if (!data) return []
    return data.prenotazioni.filter((p) => p.unitaId === unitaId)
  }

  // Blocchi OTA per unità
  function blocchiUnita(unitaId: string): Blocco[] {
    if (!data) return []
    return data.blocchiOTA.filter((b) => b.unitaId === unitaId)
  }

  // Chiusure per unità (Set di ymd)
  function chiusureUnita(unitaId: string): Set<string> {
    if (!data) return new Set()
    const s = new Set<string>()
    for (const c of data.chiusure) if (c.unitaId === unitaId) s.add(ymd(parseYMD(c.data)))
    return s
  }

  // ─── Mobile: messaggio + CTA a /host/oggi ─────────────────────────────
  return (
    <div className="space-y-4">
      {/* Mobile notice */}
      <div className="md:hidden bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 text-sm">Vista ottimizzata per tablet/desktop</h3>
        <p className="text-xs text-amber-800 mt-1">
          Il planning calendario è denso. Su mobile usa la vista <strong>Oggi</strong>.
        </p>
        <Link
          href="/host/oggi"
          className="inline-block mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold"
        >
          Apri vista Oggi →
        </Link>
      </div>

      {/* Header controls (desktop/tablet) */}
      <div className="hidden md:flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={oggi}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" /> Oggi
          </button>
          <button onClick={next} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-700 font-semibold ml-2">
            {format(start, 'd MMM', { locale: it })} → {format(addDays(end, -1), 'd MMM yyyy', { locale: it })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Range mode */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {(['14', '30', '90'] as RangeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setRange(m)}
                className={`px-3 py-1.5 ${rangeMode === m ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {m === '14' ? '2 sett' : m === '30' ? '1 mese' : '3 mesi'}
              </button>
            ))}
          </div>

          {/* Filtri */}
          {piani.length > 0 && (
            <select
              value={filterPiano}
              onChange={(e) => setFilterPiano(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
            >
              <option value="">Tutti i piani</option>
              {piani.map((p) => (
                <option key={p} value={p}>Piano {p}</option>
              ))}
            </select>
          )}

          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showSoloSporche}
              onChange={(e) => setShowSoloSporche(e.target.checked)}
            />
            Solo sporche
          </label>

          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showPrezzi}
              onChange={(e) => setShowPrezzi(e.target.checked)}
            />
            Prezzi
          </label>
        </div>
      </div>

      {/* Legend canali */}
      {data && data.canaliLegend.length > 0 && (
        <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span>Canali:</span>
          {data.canaliLegend.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.colore }} />
              {c.nome}
            </span>
          ))}
        </div>
      )}

      {errore && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {errore}
        </div>
      )}

      {/* Grid (desktop/tablet) */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && !data ? (
          <div className="py-16 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : !data || data.unita.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">Nessuna camera configurata</p>
          </div>
        ) : (
          <GridLayout
            giorni={giorni}
            unitaRaggruppate={unitaRaggruppate}
            prenotazioniUnita={prenotazioniUnita}
            blocchiUnita={blocchiUnita}
            chiusureUnita={chiusureUnita}
            tariffaGiorno={tariffaGiorno}
            showPrezzi={showPrezzi}
            onPrenotazioneClick={setPrenotazioneOpen}
            onCellClick={(u, d) => setCellOpen({ unita: u, data: d })}
            start={start}
          />
        )}
      </div>

      {/* Drawer prenotazione */}
      {prenotazioneOpen && (
        <PrenotazioneDrawer
          prenotazione={prenotazioneOpen}
          unita={data?.unita.find((u) => u.id === prenotazioneOpen.unitaId) ?? null}
          onClose={() => setPrenotazioneOpen(null)}
        />
      )}

      {/* Modal nuova prenotazione rapida */}
      {cellOpen && (
        <NuovaPrenotazioneModal
          unita={cellOpen.unita}
          data={cellOpen.data}
          onClose={() => setCellOpen(null)}
        />
      )}
    </div>
  )
}

// ─── Grid Layout ────────────────────────────────────────────────────────────

function GridLayout({
  giorni, unitaRaggruppate, prenotazioniUnita, blocchiUnita, chiusureUnita,
  tariffaGiorno, showPrezzi, onPrenotazioneClick, onCellClick, start,
}: {
  giorni: Date[]
  unitaRaggruppate: Map<string, { nome: string; perPiano: Map<number | 'nolvl', Unita[]> }>
  prenotazioniUnita: (id: string) => Prenotazione[]
  blocchiUnita: (id: string) => Blocco[]
  chiusureUnita: (id: string) => Set<string>
  tariffaGiorno: (id: string, d: Date) => TariffaPeriodo | null
  showPrezzi: boolean
  onPrenotazioneClick: (p: Prenotazione) => void
  onCellClick: (u: Unita, d: Date) => void
  start: Date
}) {
  const COL_WIDTH = 72 // px per giorno
  const ROW_HEIGHT = 48
  const LEFT_COL = 200
  const [collassati, setCollassati] = useState<Set<string>>(new Set())

  const toggleCollasso = (key: string) => {
    setCollassati((s) => {
      const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n
    })
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: LEFT_COL + giorni.length * COL_WIDTH }}>
        {/* Header giorni */}
        <div className="sticky top-0 bg-white z-10 flex border-b border-gray-200">
          <div style={{ width: LEFT_COL }} className="shrink-0 bg-gray-50 border-r border-gray-200" />
          <div className="flex">
            {giorni.map((d, i) => {
              const weekend = isWeekend(d)
              const today = isToday(d)
              return (
                <div
                  key={i}
                  style={{ width: COL_WIDTH }}
                  className={`shrink-0 px-2 py-2 text-center border-r border-gray-100 text-xs ${weekend ? 'bg-gray-50' : ''} ${today ? 'bg-red-50/50' : ''}`}
                >
                  <div className="font-semibold text-gray-900 capitalize">
                    {format(d, 'EEE d', { locale: it })}
                  </div>
                  {today && <div className="text-[10px] text-red-600 font-semibold">oggi</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Corpo */}
        {[...unitaRaggruppate.entries()].map(([strId, group]) => (
          <div key={strId}>
            {unitaRaggruppate.size > 1 && (
              <div className="bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 border-b border-gray-200 sticky left-0">
                {group.nome}
              </div>
            )}
            {[...group.perPiano.entries()]
              .sort(([a], [b]) => {
                if (a === 'nolvl') return 1
                if (b === 'nolvl') return -1
                return (a as number) - (b as number)
              })
              .map(([piano, unitaPiano]) => {
                const key = `${strId}-${piano}`
                const collapsed = collassati.has(key)
                return (
                  <div key={key}>
                    {group.perPiano.size > 1 && (
                      <button
                        onClick={() => toggleCollasso(key)}
                        className="w-full px-3 py-1 text-[11px] text-gray-500 hover:bg-gray-50 border-b border-gray-100 flex items-center gap-1 sticky left-0 bg-white"
                      >
                        {collapsed ? '▸' : '▾'} {piano === 'nolvl' ? 'Senza piano' : `Piano ${piano}`} ({unitaPiano.length})
                      </button>
                    )}
                    {!collapsed && unitaPiano.map((u) => (
                      <UnitaRow
                        key={u.id}
                        unita={u}
                        giorni={giorni}
                        prenotazioni={prenotazioniUnita(u.id)}
                        blocchi={blocchiUnita(u.id)}
                        chiusure={chiusureUnita(u.id)}
                        tariffaGiorno={tariffaGiorno}
                        showPrezzi={showPrezzi}
                        colWidth={COL_WIDTH}
                        rowHeight={ROW_HEIGHT}
                        leftCol={LEFT_COL}
                        onPrenotazioneClick={onPrenotazioneClick}
                        onCellClick={onCellClick}
                        rangeStart={start}
                        rangeDays={giorni.length}
                      />
                    ))}
                  </div>
                )
              })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Riga unità ─────────────────────────────────────────────────────────────

function UnitaRow({
  unita, giorni, prenotazioni, blocchi, chiusure, tariffaGiorno, showPrezzi,
  colWidth, rowHeight, leftCol, onPrenotazioneClick, onCellClick,
  rangeStart, rangeDays,
}: {
  unita: Unita
  giorni: Date[]
  prenotazioni: Prenotazione[]
  blocchi: Blocco[]
  chiusure: Set<string>
  tariffaGiorno: (id: string, d: Date) => TariffaPeriodo | null
  showPrezzi: boolean
  colWidth: number
  rowHeight: number
  leftCol: number
  onPrenotazioneClick: (p: Prenotazione) => void
  onCellClick: (u: Unita, d: Date) => void
  rangeStart: Date
  rangeDays: number
}) {
  function offsetCol(d: Date): number {
    const diff = differenceInCalendarDays(d, rangeStart)
    return Math.max(0, Math.min(rangeDays, diff))
  }

  return (
    <div className="flex border-b border-gray-100 hover:bg-gray-50/30" style={{ height: rowHeight }}>
      {/* Col sinistra: camera */}
      <div
        style={{ width: leftCol }}
        className="shrink-0 flex items-center gap-2 px-3 border-r border-gray-200 bg-white sticky left-0 z-[5]"
      >
        <span className={`w-2 h-2 rounded-full ${HK_DOT[unita.statoHK]}`} title={unita.statoHK} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{unita.nome}</p>
          <p className="text-[10px] text-gray-400">
            {unita.capacita} {unita.capacita === 1 ? 'posto' : 'posti'}
            {unita.piano !== null && ` · piano ${unita.piano}`}
          </p>
        </div>
      </div>

      {/* Griglia giorni */}
      <div className="relative flex" style={{ width: rangeDays * colWidth }}>
        {/* Celle di sfondo */}
        {giorni.map((d, i) => {
          const weekend = isWeekend(d)
          const today = isToday(d)
          const chiuso = chiusure.has(format(d, 'yyyy-MM-dd'))
          const tariffa = showPrezzi ? tariffaGiorno(unita.id, d) : null
          return (
            <button
              key={i}
              onClick={() => !chiuso && onCellClick(unita, d)}
              disabled={chiuso}
              style={{ width: colWidth, height: rowHeight }}
              className={`border-r border-gray-100 relative text-left ${
                chiuso
                  ? 'bg-[repeating-linear-gradient(45deg,#f3f4f6_0,#f3f4f6_4px,#e5e7eb_4px,#e5e7eb_8px)] cursor-not-allowed'
                  : weekend ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-indigo-50/40'
              } ${today ? 'bg-red-50/30' : ''}`}
            >
              {showPrezzi && tariffa && (
                <span className="absolute top-1 left-1 text-[9px] font-bold text-gray-500">
                  €{tariffa.prezzo}
                </span>
              )}
            </button>
          )
        })}

        {/* Today line */}
        {(() => {
          const todayIdx = giorni.findIndex((d) => isToday(d))
          if (todayIdx < 0) return null
          return (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
              style={{ left: todayIdx * colWidth }}
            />
          )
        })()}

        {/* Barre prenotazioni */}
        {prenotazioni.map((p) => {
          const arrivo = parseYMD(p.dataArrivo.slice(0, 10))
          const partenza = p.dataPartenza ? parseYMD(p.dataPartenza.slice(0, 10)) : addDays(arrivo, 1)
          const startCol = offsetCol(arrivo)
          const endCol = offsetCol(partenza)
          if (endCol <= 0 || startCol >= rangeDays) return null
          const badge = STATO_BADGE[p.stato] ?? STATO_BADGE.CONFERMATA
          const fromOta = p.fonte && !['Diretto', 'Web', 'Tel', 'Email'].includes(p.fonte)
          return (
            <button
              key={p.id}
              onClick={() => onPrenotazioneClick(p)}
              className={`absolute top-1 bottom-1 rounded-md overflow-hidden shadow-sm text-[12px] font-semibold flex items-center px-2 ${badge.bg} ${badge.text} hover:brightness-110 transition-all truncate`}
              style={{
                left: startCol * colWidth + 2,
                width: (endCol - startCol) * colWidth - 4,
                border: fromOta ? '2px solid rgba(0,0,0,0.15)' : undefined,
              }}
              title={`${p.guestNome} ${p.guestCognome} · ${badge.label}${fromOta ? ` · ${p.fonte}` : ''}`}
            >
              <span className="truncate">
                {p.guestCognome || p.guestNome}
              </span>
            </button>
          )
        })}

        {/* Blocchi OTA */}
        {blocchi.map((b) => {
          const start = parseYMD(b.dataInizio.slice(0, 10))
          const end = parseYMD(b.dataFine.slice(0, 10))
          const startCol = offsetCol(start)
          const endCol = offsetCol(end)
          if (endCol <= 0 || startCol >= rangeDays) return null
          return (
            <div
              key={b.id}
              className="absolute top-1 bottom-1 rounded-md overflow-hidden text-[11px] font-semibold text-white flex items-center px-2 pointer-events-none"
              style={{
                left: startCol * colWidth + 2,
                width: (endCol - startCol) * colWidth - 4,
                background: `repeating-linear-gradient(45deg, ${b.canaleColore}, ${b.canaleColore} 8px, ${b.canaleColore}CC 8px, ${b.canaleColore}CC 16px)`,
              }}
              title={`${b.canaleNome}: ${b.sommario}`}
            >
              <span className="truncate">{b.canaleNome}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Drawer prenotazione ────────────────────────────────────────────────────

function PrenotazioneDrawer({
  prenotazione: p, unita, onClose,
}: { prenotazione: Prenotazione; unita: Unita | null; onClose: () => void }) {
  const arrivo = parseYMD(p.dataArrivo.slice(0, 10))
  const partenza = p.dataPartenza ? parseYMD(p.dataPartenza.slice(0, 10)) : null
  const notti = partenza ? differenceInCalendarDays(partenza, arrivo) : 0
  const badge = STATO_BADGE[p.stato]

  return (
    <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto"
      >
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Prenotazione</p>
            <h3 className="text-lg font-bold text-gray-900 mt-0.5">
              {p.guestNome} {p.guestCognome}
            </h3>
            <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded-full ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          {unita && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">{unita.nome}</p>
                {unita.piano !== null && <p className="text-xs text-gray-500">Piano {unita.piano}</p>}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-gray-900">
                {format(arrivo, 'd MMM', { locale: it })}
                {partenza && ` → ${format(partenza, 'd MMM yyyy', { locale: it })}`}
              </p>
              {notti > 0 && (
                <p className="text-xs text-gray-500">{notti} {notti === 1 ? 'notte' : 'notti'}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-gray-400 mt-0.5" />
            <p className="text-gray-900">{p.numOspiti} {p.numOspiti === 1 ? 'ospite' : 'ospiti'}</p>
          </div>

          {p.fonte && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
              <p className="text-gray-900">Fonte: {p.fonte}</p>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Stato check-in</p>
            <p className="text-sm font-semibold text-gray-900">{p.statoCheckIn.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100">
          <Link
            href={`/host/prenotazioni/${p.id}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Apri prenotazione <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Modal nuova prenotazione rapida ───────────────────────────────────────

function NuovaPrenotazioneModal({
  unita, data, onClose,
}: { unita: Unita; data: Date; onClose: () => void }) {
  const dataStr = format(data, 'yyyy-MM-dd')
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900">Nuova prenotazione</h3>
        <p className="text-sm text-gray-500 mt-1">
          <strong>{unita.nome}</strong> · {format(data, 'EEEE d MMMM', { locale: it })}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/host/prenotazioni/nuova?unitaId=${unita.id}&dataArrivo=${dataStr}`}
            className="w-full text-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Apri form completo →
          </Link>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
