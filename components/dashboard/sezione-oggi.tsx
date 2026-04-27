'use client'

import { useMemo, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowDownToLine, ArrowUpFromLine, Users, BedDouble,
  Check, Clock, AlertCircle, ChevronRight, ShieldCheck,
  Calendar, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/hooks/use-dashboard'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  oggi: DashboardData['oggi']
  occupazione: DashboardData['occupazione']
}

// ─── Accent palette ─────────────────────────────────────────────────────────

type AccentKey = 'emerald' | 'blue' | 'violet'

const ACCENT: Record<AccentKey, { from: string; to: string; tile: string; tileSoft: string; text: string; badgeBg: string; badgeText: string }> = {
  emerald: {
    from: '#10b981', to: '#059669',
    tile: 'rgba(16,185,129,0.18)', tileSoft: 'rgba(16,185,129,0.08)',
    text: '#059669',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
  },
  blue: {
    from: '#3b82f6', to: '#2563eb',
    tile: 'rgba(59,130,246,0.18)', tileSoft: 'rgba(59,130,246,0.08)',
    text: '#2563eb',
    badgeBg: 'bg-blue-50 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-400',
  },
  violet: {
    from: '#8b5cf6', to: '#7c3aed',
    tile: 'rgba(139,92,246,0.18)', tileSoft: 'rgba(139,92,246,0.08)',
    text: '#7c3aed',
    badgeBg: 'bg-violet-50 dark:bg-violet-900/30',
    badgeText: 'text-violet-700 dark:text-violet-400',
  },
}

function accentStyle(k: AccentKey): CSSProperties {
  const a = ACCENT[k]
  return {
    '--card-accent-from': a.from,
    '--card-accent-to': a.to,
    '--tile-from': a.tile,
    '--tile-to': a.tileSoft,
    '--tile-color': a.text,
  } as CSSProperties
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SezioneOggi({ oggi, occupazione }: Props) {
  const dataEstesa = useMemo(() => {
    try {
      const d = new Date(oggi.data + 'T12:00:00')
      return d.toLocaleDateString('it-IT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch {
      return `${oggi.giorno} ${oggi.data}`
    }
  }, [oggi.data, oggi.giorno])

  return (
    <div className="space-y-5">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="icon-tile icon-tile-lg" style={{ '--tile-from': 'rgba(99,102,241,0.18)', '--tile-to': 'rgba(99,102,241,0.08)', '--tile-color': '#6366f1' } as CSSProperties}>
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Oggi</p>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 capitalize leading-tight">
              {dataEstesa}
            </h2>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-slate-200/60 dark:ring-slate-700/60">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-sm">
            <Users size={13} className="text-slate-500" />
          </span>
          {oggi.inHouse} in struttura
        </span>
      </div>

      {/* ═══ Cards ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <CardArrivi arrivi={oggi.arrivi} />
        <CardPartenze partenze={oggi.partenze} />
        <CardOccupazione occupazione={occupazione} />
      </div>
    </div>
  )
}

// ─── Shared header ──────────────────────────────────────────────────────────

function CardHeader({
  accent, icon, title, count, link, badges,
}: {
  accent: AccentKey
  icon: ReactNode
  title: string
  count?: number
  link?: { href: string; label: string }
  badges?: ReactNode
}) {
  const a = ACCENT[accent]
  return (
    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="icon-tile">{icon}</div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {typeof count === 'number' && (
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-full text-xs font-bold',
                a.badgeBg, a.badgeText,
              )}
            >
              {count}
            </span>
          )}
        </div>
        {link && (
          <Link
            href={link.href}
            className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-0.5"
          >
            {link.label} <ChevronRight size={12} />
          </Link>
        )}
      </div>
      {badges && <div className="flex flex-wrap gap-1.5 mt-2.5">{badges}</div>}
    </div>
  )
}

// ─── Card Arrivi ────────────────────────────────────────────────────────────

function CardArrivi({ arrivi }: { arrivi: DashboardData['oggi']['arrivi'] }) {
  return (
    <div className="card-accent flex flex-col p-0 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" style={accentStyle('emerald')}>
      <CardHeader
        accent="emerald"
        icon={<ArrowDownToLine size={16} />}
        title="Arrivi"
        count={arrivi.totale}
        link={{ href: '/host/oggi', label: 'Tutti' }}
        badges={arrivi.totale > 0 ? (
          <>
            {arrivi.checkinCompletati > 0 && (
              <BadgePill tone="emerald" icon={<Check size={10} />}>
                {arrivi.checkinCompletati} verificat{arrivi.checkinCompletati === 1 ? 'o' : 'i'}
              </BadgePill>
            )}
            {arrivi.checkinOnline > 0 && (
              <BadgePill tone="blue" icon={<ShieldCheck size={10} />}>
                {arrivi.checkinOnline} da verificare
              </BadgePill>
            )}
            {arrivi.checkinMancanti > 0 && (
              <BadgePill tone="slate" icon={<Clock size={10} />}>
                {arrivi.checkinMancanti} in attesa
              </BadgePill>
            )}
          </>
        ) : null}
      />

      <div className="flex-1 min-h-0">
        {arrivi.totale === 0 ? (
          <EmptyState text="Nessun arrivo oggi" />
        ) : (
          <div className="relative">
            <div className="max-h-[300px] overflow-y-auto py-1">
              {arrivi.lista.map((guest) => (
                <GuestRow
                  key={guest.id}
                  href={`/host/prenotazioni/${guest.id}`}
                  name={`${guest.guestNome} ${guest.guestCognome}`}
                  subtitle={[
                    guest.unitaNome ? { icon: <BedDouble size={10} />, text: guest.unitaNome } : null,
                    guest.numOspiti > 1 ? { icon: <Users size={10} />, text: `${guest.numOspiti} ospiti` } : null,
                  ].filter(Boolean) as { icon: ReactNode; text: string }[]}
                  badge={<CheckinBadge stato={guest.statoCheckIn} />}
                />
              ))}
            </div>
            {arrivi.lista.length > 4 && <FadeOut />}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card Partenze ──────────────────────────────────────────────────────────

function CardPartenze({ partenze }: { partenze: DashboardData['oggi']['partenze'] }) {
  return (
    <div className="card-accent flex flex-col p-0 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" style={accentStyle('blue')}>
      <CardHeader
        accent="blue"
        icon={<ArrowUpFromLine size={16} />}
        title="Partenze"
        count={partenze.totale}
        link={{ href: '/host/oggi', label: 'Tutti' }}
      />

      <div className="flex-1 min-h-0">
        {partenze.totale === 0 ? (
          <EmptyState text="Nessuna partenza oggi" />
        ) : (
          <div className="relative">
            <div className="max-h-[300px] overflow-y-auto py-1">
              {partenze.lista.map((guest) => (
                <GuestRow
                  key={guest.id}
                  href={`/host/prenotazioni/${guest.id}`}
                  name={`${guest.guestNome} ${guest.guestCognome}`}
                  subtitle={guest.unitaNome ? [{ icon: <BedDouble size={10} />, text: guest.unitaNome }] : []}
                  badge={guest.regCardFirmata
                    ? <BadgePill tone="emerald" icon={<Check size={10} />}>Checkout</BadgePill>
                    : <BadgePill tone="amber" icon={<AlertCircle size={10} />}>Manca firma</BadgePill>
                  }
                />
              ))}
            </div>
            {partenze.lista.length > 4 && <FadeOut />}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card Occupazione ───────────────────────────────────────────────────────

function CardOccupazione({ occupazione }: { occupazione: DashboardData['occupazione'] }) {
  const { percentuale, unitaOccupate, unitaTotali, settimana } = occupazione

  // Dynamic color: primary <70%, warning 70-90%, error >90%
  const donutColor = percentuale > 90 ? 'var(--color-error-500)'
    : percentuale > 70 ? 'var(--color-warning-500)'
    : 'var(--color-primary-500)'
  const donutTextClass = percentuale > 90 ? 'text-error-600'
    : percentuale > 70 ? 'text-warning-600'
    : 'text-primary-600'

  // Donut circonferenza: 2πr dove r=50 (spec: stroke 10, diametro totale 120)
  const RADIUS = 50
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS // 314.159

  const maxOcc = Math.max(...settimana.map((d) => d.occupate), 1)

  return (
    <div className="card-accent flex flex-col p-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" style={accentStyle('violet')}>
      <CardHeader
        accent="violet"
        icon={<TrendingUp size={16} />}
        title="Occupazione"
      />

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-5 gap-5">
        {/* ── Donut 120×120, stroke 10px, animato da 0 via transition ── */}
        <div className="relative w-[120px] h-[120px]">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle
              cx="60" cy="60" r={RADIUS}
              fill="none"
              stroke="var(--color-neutral-200)"
              strokeWidth="10"
            />
            <circle
              cx="60" cy="60" r={RADIUS}
              fill="none"
              stroke={donutColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - percentuale / 100)}
              style={{ transition: 'stroke-dashoffset 800ms var(--ease-out), stroke 300ms ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-[28px] font-bold tabular-nums tracking-[-0.02em] leading-none', donutTextClass)}>
              {percentuale}%
            </span>
          </div>
        </div>
        <p className="text-[12px] text-neutral-500 -mt-2 tabular-nums">
          {unitaOccupate}/{unitaTotali} camere
        </p>

        {/* ── BARCHART SETTIMANA — 7 barre verticali ── */}
        {settimana.length > 0 && (
          <div className="w-full">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.02em] mb-2 text-center">
              Prossimi 7 giorni
            </p>
            <div className="flex items-end justify-center gap-1">
              {settimana.slice(0, 7).map((day, i) => {
                const barHeight = maxOcc > 0 ? (day.occupate / maxOcc) * 80 : 0
                const isToday = i === 0
                return (
                  <div
                    key={day.data}
                    className="group relative flex flex-col items-center gap-1.5"
                    title={`${isToday ? 'Oggi' : day.giorno}: ${day.occupate}/${day.totali}`}
                  >
                    {/* Barra */}
                    <div className="flex items-end h-[80px]">
                      <div
                        className={cn(
                          'w-[24px] rounded-t-sm transition-all duration-500 ease-out',
                          isToday
                            ? 'bg-primary-600 group-hover:bg-primary-700'
                            : 'bg-primary-200 group-hover:bg-primary-300',
                        )}
                        style={{ height: `${Math.max(barHeight, 2)}px` }}
                      />
                    </div>
                    {/* Label giorno — iniziale */}
                    <span className={cn(
                      'text-[11px] leading-none tabular-nums',
                      isToday ? 'font-semibold text-neutral-800' : 'text-neutral-400',
                    )}>
                      {day.giorno.charAt(0).toUpperCase()}
                    </span>
                    {/* Tooltip on hover */}
                    <span
                      role="tooltip"
                      className="absolute bottom-full mb-1 px-2 py-1 bg-neutral-800 text-white text-[11px] font-medium rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 tabular-nums"
                    >
                      {day.occupate}/{day.totali}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Guest row ──────────────────────────────────────────────────────────────

function GuestRow({
  href, name, subtitle, badge,
}: {
  href: string
  name: string
  subtitle: { icon: ReactNode; text: string }[]
  badge: ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</p>
        {subtitle.length > 0 && (
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
            {subtitle.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-0.5">
                {s.icon}{s.text}
              </span>
            ))}
          </div>
        )}
      </div>
      {badge}
      <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )
}

// ─── Badge pill ─────────────────────────────────────────────────────────────

const TONE_CLS: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800/40',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/60 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800/40',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800/40',
  slate: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/60 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800/40',
}

function BadgePill({ tone, icon, children }: { tone: string; icon: ReactNode; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0', TONE_CLS[tone] ?? TONE_CLS.slate)}>
      {icon}
      {children}
    </span>
  )
}

function CheckinBadge({ stato }: { stato: string }) {
  switch (stato) {
    case 'VERIFICATO':
      return <BadgePill tone="emerald" icon={<Check size={10} />}>Verificato</BadgePill>
    case 'ONLINE_COMPLETATO':
      return <BadgePill tone="blue" icon={<ShieldCheck size={10} />}>Da verificare</BadgePill>
    default:
      return <BadgePill tone="slate" icon={<Clock size={10} />}>In attesa</BadgePill>
  }
}

// ─── Fade-out ───────────────────────────────────────────────────────────────

function FadeOut() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mb-3 ring-1 ring-inset ring-slate-200/60 dark:ring-slate-700/60">
        <Check size={20} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-sm text-slate-400 font-medium">{text}</p>
    </div>
  )
}
