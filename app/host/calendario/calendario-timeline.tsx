'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  format, addDays, subDays, startOfDay, differenceInDays,
  isWeekend, isSameDay, isToday,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { formatValuta } from '@/lib/formatters'
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Calendar, Users, BedDouble, ArrowRightLeft,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type Prenotazione = {
  id: string
  guestNome: string
  guestCognome: string
  dataArrivo: string | Date
  dataPartenza: string | Date | null
  numOspiti: number
  stato: string
  prezzoTotale: number | null
}

type Unita = {
  id: string
  nome: string
  capacita: number
  lettiExtra: number
  piano: number | null
  statoHK: string
  prenotazioni: Prenotazione[]
  disponibilita: { data: string | Date }[]
}

type Struttura = {
  id: string
  nome: string
  tipo: string
  unita: Unita[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATO_COLORI: Record<string, { bg: string; text: string; bar: string }> = {
  RICHIESTA:   { bg: 'bg-yellow-100', text: 'text-yellow-800', bar: '#fbbf24' },
  CONFERMATA:  { bg: 'bg-green-100',  text: 'text-green-800',  bar: '#22c55e' },
  COMPLETATA:  { bg: 'bg-blue-100',   text: 'text-blue-800',   bar: '#60a5fa' },
}

const HK_ICON: Record<string, string> = {
  PULITA: '✅', SPORCA: '🟠', IN_PULIZIA: '🧹',
  MANUTENZIONE: '🔧', FUORI_SERVIZIO: '⛔', NON_DISTURBARE: '🔕',
}

const CELL_WIDTHS = [28, 36, 48] // zoom levels
const DAYS_VISIBLE = [42, 31, 21] // days shown per zoom level

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarioTimeline({ strutture }: { strutture: Struttura[] }) {
  const t = useTranslations('host.calendar')
  const tc = useTranslations('common')
  const router = useRouter()
  const [startDate, setStartDate] = useState(() => subDays(startOfDay(new Date()), 2))
  const [zoom, setZoom] = useState(1) // 0=compact, 1=normal, 2=wide
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ pren: Prenotazione; x: number; y: number } | null>(null)

  const cellW = CELL_WIDTHS[zoom]
  const numDays = DAYS_VISIBLE[zoom]
  const days = useMemo(
    () => Array.from({ length: numDays }, (_, i) => addDays(startDate, i)),
    [startDate, numDays]
  )

  // ─── Navigation ─────────────────────────────────────────────────────────────

  function nav(offset: number) {
    setStartDate(d => addDays(d, offset))
  }
  function goToday() {
    setStartDate(subDays(startOfDay(new Date()), 2))
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getBarStyle(pren: Prenotazione) {
    const arrivo = startOfDay(new Date(pren.dataArrivo))
    const partenza = pren.dataPartenza
      ? startOfDay(new Date(pren.dataPartenza))
      : addDays(arrivo, 1) // single night fallback
    const timelineStart = startDate
    const timelineEnd = addDays(startDate, numDays)

    // Clamp to visible range
    const barStart = arrivo < timelineStart ? timelineStart : arrivo
    const barEnd = partenza > timelineEnd ? timelineEnd : partenza

    const leftDays = differenceInDays(barStart, timelineStart)
    const widthDays = differenceInDays(barEnd, barStart)

    if (widthDays <= 0) return null

    const colori = STATO_COLORI[pren.stato] ?? STATO_COLORI.RICHIESTA

    return {
      left: leftDays * cellW,
      width: widthDays * cellW - 2,
      color: colori.bar,
      clippedLeft: arrivo < timelineStart,
      clippedRight: partenza > timelineEnd,
    }
  }

  // Click empty cell → open new booking form pre-filled
  const handleCellClick = useCallback((strutturaId: string, unitaId: string, day: Date) => {
    const arrivo = format(day, 'yyyy-MM-dd')
    const partenza = format(addDays(day, 1), 'yyyy-MM-dd')
    router.push(
      `/host/prenotazioni/nuova?strutturaId=${strutturaId}&unitaId=${unitaId}&dataArrivo=${arrivo}&dataPartenza=${partenza}`
    )
  }, [router])

  function isClosedDay(u: Unita, day: Date) {
    const ds = format(day, 'yyyy-MM-dd')
    return u.disponibilita.some(d => {
      const dStr = typeof d.data === 'string' ? d.data : d.data.toISOString()
      return dStr.substring(0, 10) === ds
    })
  }

  // ─── KPI ────────────────────────────────────────────────────────────────────

  const today = startOfDay(new Date())
  const allUnita = strutture.flatMap(s => s.unita)
  const totalRooms = allUnita.length
  const occupiedToday = allUnita.filter(u =>
    u.prenotazioni.some(p => {
      const a = startOfDay(new Date(p.dataArrivo))
      const z = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : addDays(a, 1)
      return a <= today && z > today && (p.stato === 'CONFERMATA' || p.stato === 'COMPLETATA')
    })
  ).length
  const arrivalsToday = allUnita.flatMap(u =>
    u.prenotazioni.filter(p => isSameDay(new Date(p.dataArrivo), today) && p.stato !== 'ANNULLATA')
  ).length
  const departuresToday = allUnita.flatMap(u =>
    u.prenotazioni.filter(p => p.dataPartenza && isSameDay(new Date(p.dataPartenza), today))
  ).length

  return (
    <div className="space-y-4">
      {/* ─── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card flex items-center gap-3 py-3 px-4">
          <BedDouble className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-lg font-bold text-gray-900">{occupiedToday}/{totalRooms}</p>
            <p className="text-xs text-gray-500">Occupate oggi</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-3 px-4">
          <span className="text-lg">📊</span>
          <div>
            <p className="text-lg font-bold text-gray-900">
              {totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500">Occupazione</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-3 px-4">
          <span className="text-lg text-green-600">↓</span>
          <div>
            <p className="text-lg font-bold text-gray-900">{arrivalsToday}</p>
            <p className="text-xs text-gray-500">Arrivi oggi</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-3 px-4">
          <span className="text-lg text-amber-600">↑</span>
          <div>
            <p className="text-lg font-bold text-gray-900">{departuresToday}</p>
            <p className="text-xs text-gray-500">Partenze oggi</p>
          </div>
        </div>
      </div>

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-7)} className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200" title="- 7 giorni">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />Oggi
          </button>
          <button onClick={() => nav(7)} className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200" title="+ 7 giorni">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-700 ml-2 capitalize">
            {format(startDate, 'd MMM', { locale: it })} — {format(addDays(startDate, numDays - 1), 'd MMM yyyy', { locale: it })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Legenda */}
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-400 mr-2">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ backgroundColor: '#22c55e' }} />Confermata</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ backgroundColor: '#fbbf24' }} />Richiesta</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ backgroundColor: '#60a5fa' }} />Completata</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" />Chiuso</span>
          </div>
          <button
            onClick={() => setZoom(z => Math.max(0, z - 1))}
            disabled={zoom === 0}
            className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200 disabled:opacity-30"
            title="Comprimi"
          >
            <ZoomOut className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setZoom(z => Math.min(2, z + 1))}
            disabled={zoom === 2}
            className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200 disabled:opacity-30"
            title="Espandi"
          >
            <ZoomIn className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ─── Timeline grid ─────────────────────────────────────────────────── */}
      {strutture.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Nessuna struttura attiva. Crea una struttura per visualizzare il calendario.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm" ref={scrollRef}>
          <div style={{ minWidth: `${220 + numDays * cellW}px` }}>
            {/* ── Date header ── */}
            <div className="flex sticky top-0 z-30 bg-white border-b border-gray-200">
              <div className="w-[220px] min-w-[220px] shrink-0 border-r border-gray-200 px-3 py-2">
                <span className="text-xs font-semibold text-gray-400">STANZA</span>
              </div>
              <div className="flex">
                {days.map(day => {
                  const isWE = isWeekend(day)
                  const isTod = isToday(day)
                  return (
                    <div
                      key={day.toISOString()}
                      className={`text-center border-r border-gray-100 shrink-0 py-1.5 ${
                        isTod ? 'bg-indigo-50' : isWE ? 'bg-rose-50/50' : ''
                      }`}
                      style={{ width: cellW }}
                    >
                      <div className={`text-xs font-bold leading-tight ${
                        isTod ? 'text-indigo-700' : isWE ? 'text-rose-400' : 'text-gray-500'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="text-gray-300 text-[10px] leading-tight">
                        {format(day, 'EEE', { locale: it }).substring(0, 2)}
                      </div>
                      {day.getDate() === 1 && (
                        <div className="text-[9px] text-indigo-500 font-semibold uppercase leading-tight">
                          {format(day, 'MMM', { locale: it })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Strutture + Unità rows ── */}
            {strutture.map(struttura => (
              <div key={struttura.id}>
                {/* Structure header */}
                <div className="flex bg-slate-50 border-b border-gray-200">
                  <div className="w-[220px] min-w-[220px] shrink-0 border-r border-gray-200 px-3 py-1.5">
                    <Link
                      href={`/host/strutture/${struttura.id}`}
                      className="text-xs font-bold text-gray-700 uppercase tracking-wide hover:text-indigo-600"
                    >
                      {struttura.nome}
                    </Link>
                  </div>
                  <div style={{ width: numDays * cellW }} />
                </div>

                {/* Unit rows */}
                {struttura.unita.map((unita, ui) => (
                  <div
                    key={unita.id}
                    className={`flex border-b border-gray-100 ${ui % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                  >
                    {/* Room label */}
                    <div className="w-[220px] min-w-[220px] shrink-0 border-r border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-800">{unita.nome}</span>
                        <span className="text-xs" title={`HK: ${unita.statoHK}`}>
                          {HK_ICON[unita.statoHK] ?? ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-0.5">
                          <Users className="w-3 h-3" />{unita.capacita}
                          {unita.lettiExtra > 0 && `+${unita.lettiExtra}`}
                        </span>
                        {unita.piano != null && (
                          <span>P{unita.piano}</span>
                        )}
                      </div>
                    </div>

                    {/* Timeline cells */}
                    <div className="relative" style={{ width: numDays * cellW, minHeight: 44 }}>
                      {/* Day grid lines + closed markers + click-to-book */}
                      <div className="absolute inset-0 flex">
                        {days.map(day => {
                          const closed = isClosedDay(unita, day)
                          const isTod = isToday(day)
                          const occupied = unita.prenotazioni.some(p => {
                            const a = startOfDay(new Date(p.dataArrivo))
                            const z = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : addDays(a, 1)
                            return day >= a && day < z
                          })
                          const canBook = !closed && !occupied && day >= startOfDay(new Date())
                          return (
                            <div
                              key={day.toISOString()}
                              className={`border-r border-gray-100 shrink-0 ${
                                closed ? 'bg-red-50' : isTod ? 'bg-indigo-50/30' : ''
                              } ${canBook ? 'cursor-pointer hover:bg-green-50 transition-colors' : ''}`}
                              style={{ width: cellW }}
                              onClick={canBook ? () => handleCellClick(struttura.id, unita.id, day) : undefined}
                              title={canBook ? 'Clicca per prenotare' : undefined}
                            />
                          )
                        })}
                      </div>

                      {/* Booking bars */}
                      {unita.prenotazioni.map(pren => {
                        const bar = getBarStyle(pren)
                        if (!bar) return null
                        return (
                          <Link
                            key={pren.id}
                            href={`/host/prenotazioni/${pren.id}`}
                            className="absolute top-1.5 h-7 rounded-md flex items-center overflow-hidden cursor-pointer hover:brightness-90 transition-all shadow-sm group z-10"
                            style={{
                              left: bar.left + 1,
                              width: bar.width,
                              backgroundColor: bar.color,
                              borderTopLeftRadius: bar.clippedLeft ? 0 : undefined,
                              borderBottomLeftRadius: bar.clippedLeft ? 0 : undefined,
                              borderTopRightRadius: bar.clippedRight ? 0 : undefined,
                              borderBottomRightRadius: bar.clippedRight ? 0 : undefined,
                            }}
                            title={`${pren.guestNome} ${pren.guestCognome} · ${pren.numOspiti} ospiti${
                              pren.prezzoTotale ? ` · ${formatValuta(pren.prezzoTotale)}` : ''
                            }`}
                            onMouseEnter={e => setTooltip({ pren, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {bar.clippedLeft && (
                              <ArrowRightLeft className="w-3 h-3 text-white/60 shrink-0 ml-0.5" />
                            )}
                            <span className="px-1.5 text-white text-xs font-medium truncate whitespace-nowrap leading-none">
                              {pren.guestCognome}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {struttura.unita.length === 0 && (
                  <div className="flex border-b border-gray-100 bg-white">
                    <div className="w-[220px] min-w-[220px] shrink-0 border-r border-gray-200" />
                    <div className="py-3 px-4 text-xs text-gray-400 italic">
                      Nessuna unità attiva
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tooltip ───────────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-white rounded-xl shadow-xl border border-gray-200 px-4 py-3 max-w-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-semibold text-gray-900 text-sm">
            {tooltip.pren.guestNome} {tooltip.pren.guestCognome}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {format(new Date(tooltip.pren.dataArrivo), 'd MMM', { locale: it })}
            {tooltip.pren.dataPartenza && ` → ${format(new Date(tooltip.pren.dataPartenza), 'd MMM', { locale: it })}`}
            {' · '}{tooltip.pren.numOspiti} ospiti
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                (STATO_COLORI[tooltip.pren.stato] ?? STATO_COLORI.RICHIESTA).bg
              } ${(STATO_COLORI[tooltip.pren.stato] ?? STATO_COLORI.RICHIESTA).text}`}
            >
              {tooltip.pren.stato}
            </span>
            {tooltip.pren.prezzoTotale != null && (
              <span className="text-xs font-semibold text-gray-700">€{tooltip.pren.prezzoTotale}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
