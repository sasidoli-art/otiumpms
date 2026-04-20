'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameDay,
  isSameMonth, isBefore, isAfter, differenceInCalendarDays, format,
} from 'date-fns'
import { it } from 'date-fns/locale'

type Props = {
  arrivo: Date | null
  partenza: Date | null
  onChange: (arrivo: Date | null, partenza: Date | null) => void
  /** Giorni non disponibili (ISO yyyy-MM-dd). Se null/undefined: tutti disponibili */
  giorniNonDisponibili?: Set<string>
  /** Giorni con disponibilità parziale (mostra pallino) */
  giorniPartial?: Set<string>
  /** Massimo notti (default 30) */
  maxNotti?: number
}

/**
 * Range picker con 2 mesi affiancati (desktop) / 1 mese (mobile).
 * Selezione: click arrivo → click partenza → range evidenziato.
 * Re-click arrivo: reset selezione.
 */
export default function DateRangePicker({
  arrivo, partenza, onChange, giorniNonDisponibili, giorniPartial, maxNotti = 30,
}: Props) {
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const [mese, setMese] = useState<Date>(arrivo ?? oggi)
  const [hover, setHover] = useState<Date | null>(null)

  const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

  function clickGiorno(d: Date) {
    if (isBefore(d, oggi)) return
    if (giorniNonDisponibili?.has(ymd(d))) return

    if (!arrivo || (arrivo && partenza)) {
      onChange(d, null)
      return
    }
    // Seconda click: setta partenza
    if (isBefore(d, arrivo)) {
      onChange(d, null)
      return
    }
    if (isSameDay(d, arrivo)) {
      onChange(null, null) // toggle off
      return
    }
    const notti = differenceInCalendarDays(d, arrivo)
    if (notti > maxNotti) {
      onChange(arrivo, addDays(arrivo, maxNotti))
      return
    }
    onChange(arrivo, d)
  }

  function isInRange(d: Date): boolean {
    if (!arrivo) return false
    const end = partenza ?? hover
    if (!end) return isSameDay(d, arrivo)
    if (isBefore(end, arrivo)) return false
    return !isBefore(d, arrivo) && !isAfter(d, end)
  }

  function renderMese(date: Date) {
    const inizioMese = startOfMonth(date)
    const fineMese = endOfMonth(date)
    const inizioGriglia = startOfWeek(inizioMese, { weekStartsOn: 1 })
    const fineGriglia = endOfWeek(fineMese, { weekStartsOn: 1 })

    const giorni: Date[] = []
    let cursor = inizioGriglia
    while (!isAfter(cursor, fineGriglia)) {
      giorni.push(cursor)
      cursor = addDays(cursor, 1)
    }

    return (
      <div>
        <div className="text-center font-semibold text-sm text-gray-900 mb-3 capitalize">
          {format(date, 'LLLL yyyy', { locale: it })}
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-gray-400 mb-1">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {giorni.map((g, i) => {
            const inCurrentMonth = isSameMonth(g, date)
            const past = isBefore(g, oggi)
            const isArrivo = arrivo && isSameDay(g, arrivo)
            const isPartenza = partenza && isSameDay(g, partenza)
            const inRange = isInRange(g)
            const unavail = giorniNonDisponibili?.has(ymd(g))
            const partial = giorniPartial?.has(ymd(g))
            const disabled = past || unavail || !inCurrentMonth
            const endpoint = isArrivo || isPartenza

            return (
              <button
                type="button"
                key={i}
                onClick={() => inCurrentMonth && clickGiorno(g)}
                onMouseEnter={() => setHover(g)}
                onMouseLeave={() => setHover(null)}
                disabled={disabled}
                className={`
                  aspect-square text-xs relative transition-colors
                  ${!inCurrentMonth ? 'invisible' : ''}
                  ${past ? 'text-gray-300 cursor-not-allowed' : ''}
                  ${unavail && !past ? 'text-gray-300 line-through cursor-not-allowed' : ''}
                  ${inRange && !endpoint ? 'bg-indigo-50' : ''}
                  ${endpoint ? 'text-white font-bold' : ''}
                  ${!disabled && !endpoint && !inRange ? 'hover:bg-gray-100' : ''}
                `}
                style={endpoint ? { backgroundColor: 'var(--brand-primary, #4f46e5)' } : undefined}
              >
                {g.getDate()}
                {partial && !unavail && !past && !endpoint && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const notti = arrivo && partenza ? differenceInCalendarDays(partenza, arrivo) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setMese(addMonths(mese, -1))}
          disabled={!isAfter(addMonths(mese, -1), addMonths(oggi, -1))}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {notti > 0 && (
          <span className="text-sm font-semibold text-gray-700">
            {notti} {notti === 1 ? 'notte' : 'notti'}
          </span>
        )}
        <button
          type="button"
          onClick={() => setMese(addMonths(mese, 1))}
          className="p-1.5 rounded hover:bg-gray-100"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>{renderMese(mese)}</div>
        <div className="hidden md:block">{renderMese(addMonths(mese, 1))}</div>
      </div>
    </div>
  )
}
