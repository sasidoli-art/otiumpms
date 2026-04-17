'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowDownToLine, ArrowUpFromLine, Users, BedDouble,
  Check, Clock, AlertCircle, ChevronRight, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/hooks/use-dashboard'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  oggi: DashboardData['oggi']
  occupazione: DashboardData['occupazione']
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SezioneOggi({ oggi, occupazione }: Props) {
  // Format date: "Venerdì 17 aprile 2026"
  const dataEstesa = useMemo(() => {
    try {
      const d = new Date(oggi.data + 'T12:00:00')
      return d.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return `${oggi.giorno} ${oggi.data}`
    }
  }, [oggi.data, oggi.giorno])

  return (
    <div className="space-y-5">
      {/* ═══ Header ═══════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 capitalize">
            {dataEstesa}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Users size={14} />
          {oggi.inHouse} ospiti in struttura
        </span>
      </div>

      {/* ═══ Three columns ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        <CardArrivi arrivi={oggi.arrivi} />
        <CardPartenze partenze={oggi.partenze} />
        <CardOccupazione occupazione={occupazione} />
      </div>
    </div>
  )
}

// ─── Card Arrivi ────────────────────────────────────────────────────────────

function CardArrivi({ arrivi }: { arrivi: DashboardData['oggi']['arrivi'] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-emerald-500 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownToLine size={16} className="text-emerald-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Arrivi</h3>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              {arrivi.totale}
            </span>
          </div>
          <Link href="/host/oggi" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Vedi tutti <ChevronRight size={12} className="inline" />
          </Link>
        </div>

        {/* Checkin status badges */}
        {arrivi.totale > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {arrivi.checkinCompletati > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <Check size={10} /> {arrivi.checkinCompletati} verificat{arrivi.checkinCompletati === 1 ? 'o' : 'i'}
              </span>
            )}
            {arrivi.checkinOnline > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                <ShieldCheck size={10} /> {arrivi.checkinOnline} da verificare
              </span>
            )}
            {arrivi.checkinMancanti > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                <Clock size={10} /> {arrivi.checkinMancanti} in attesa
              </span>
            )}
          </div>
        )}
      </div>

      {/* Guest list */}
      <div className="flex-1 min-h-0">
        {arrivi.totale === 0 ? (
          <EmptyState text="Nessun arrivo oggi" />
        ) : (
          <div className="relative">
            <div className="max-h-[300px] overflow-y-auto">
              {arrivi.lista.map(guest => (
                <Link
                  key={guest.id}
                  href={`/host/prenotazioni/${guest.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {guest.guestNome} {guest.guestCognome}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {guest.unitaNome && (
                        <span className="text-[11px] text-slate-400">
                          <BedDouble size={10} className="inline mr-0.5" />{guest.unitaNome}
                        </span>
                      )}
                      {guest.numOspiti > 1 && (
                        <span className="text-[11px] text-slate-400">{guest.numOspiti} ospiti</span>
                      )}
                    </div>
                  </div>

                  <CheckinBadge stato={guest.statoCheckIn} />

                  <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              ))}
            </div>
            {/* Fade-out gradient at bottom when list is long */}
            {arrivi.lista.length > 4 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card Partenze ──────────────────────────────────────────────────────────

function CardPartenze({ partenze }: { partenze: DashboardData['oggi']['partenze'] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-blue-500 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine size={16} className="text-blue-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Partenze</h3>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
              {partenze.totale}
            </span>
          </div>
          <Link href="/host/oggi" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Vedi tutti <ChevronRight size={12} className="inline" />
          </Link>
        </div>
      </div>

      {/* Guest list */}
      <div className="flex-1 min-h-0">
        {partenze.totale === 0 ? (
          <EmptyState text="Nessuna partenza oggi" />
        ) : (
          <div className="relative">
            <div className="max-h-[300px] overflow-y-auto">
              {partenze.lista.map(guest => (
                <Link
                  key={guest.id}
                  href={`/host/prenotazioni/${guest.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {guest.guestNome} {guest.guestCognome}
                    </p>
                    {guest.unitaNome && (
                      <span className="text-[11px] text-slate-400">
                        <BedDouble size={10} className="inline mr-0.5" />{guest.unitaNome}
                      </span>
                    )}
                  </div>

                  {guest.regCardFirmata ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <Check size={10} /> Checkout
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      <AlertCircle size={10} /> Manca firma
                    </span>
                  )}

                  <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              ))}
            </div>
            {partenze.lista.length > 4 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card Occupazione ───────────────────────────────────────────────────────

function CardOccupazione({ occupazione }: { occupazione: DashboardData['occupazione'] }) {
  const { percentuale, unitaOccupate, unitaTotali, settimana } = occupazione

  // Donut color: green < 70, yellow 70-90, red > 90
  const donutColor = percentuale > 90
    ? 'text-red-500 dark:text-red-400'
    : percentuale > 70
      ? 'text-amber-500 dark:text-amber-400'
      : 'text-emerald-500 dark:text-emerald-400'

  const donutStroke = percentuale > 90
    ? '#ef4444'
    : percentuale > 70
      ? '#f59e0b'
      : '#10b981'

  // Find max occupancy day for highlight
  const maxOcc = Math.max(...settimana.map(d => d.occupate), 1)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-violet-500 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BedDouble size={16} className="text-violet-500" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Occupazione</h3>
        </div>
      </div>

      {/* Donut + bars */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-5">
        {/* SVG donut */}
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {/* Background ring */}
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-slate-100 dark:text-slate-800"
            />
            {/* Value ring */}
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke={donutStroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(percentuale / 100) * 314.16} 314.16`}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-bold', donutColor)}>
              {percentuale}%
            </span>
            <span className="text-[11px] text-slate-400">
              {unitaOccupate}/{unitaTotali} camere
            </span>
          </div>
        </div>

        {/* 7-day mini bar chart */}
        {settimana.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Prossimi 7 giorni</p>
            {settimana.map((day, i) => {
              const pct = day.totali > 0 ? (day.occupate / day.totali) * 100 : 0
              const barWidth = maxOcc > 0 ? (day.occupate / maxOcc) * 100 : 0
              const isMax = day.occupate === maxOcc && maxOcc > 0
              const isToday = i === 0

              return (
                <div key={day.data} className="flex items-center gap-2">
                  <span className={cn(
                    'text-[11px] w-7 shrink-0 text-right font-medium',
                    isToday ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-400',
                  )}>
                    {isToday ? 'Oggi' : day.giorno}
                  </span>
                  <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isMax
                          ? 'bg-violet-500 dark:bg-violet-400'
                          : 'bg-violet-300 dark:bg-violet-600',
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className={cn(
                    'text-[11px] w-10 shrink-0 tabular-nums',
                    isMax ? 'font-bold text-violet-600 dark:text-violet-400' : 'text-slate-400',
                  )}>
                    {day.occupate}/{day.totali}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Checkin badge ──────────────────────────────────────────────────────────

function CheckinBadge({ stato }: { stato: string }) {
  switch (stato) {
    case 'VERIFICATO':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
          <Check size={10} /> Verificato
        </span>
      )
    case 'ONLINE_COMPLETATO':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
          <ShieldCheck size={10} /> Da verificare
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
          <Clock size={10} /> In attesa
        </span>
      )
  }
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <Check size={20} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  )
}
