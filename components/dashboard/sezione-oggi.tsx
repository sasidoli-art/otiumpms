'use client'

import { useMemo, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowDownToLine, ArrowUpFromLine, Users, BedDouble,
  Check, Clock, AlertCircle, ChevronRight, ShieldCheck,
  Calendar, TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/hooks/use-dashboard'

interface Props {
  oggi: DashboardData['oggi']
  occupazione: DashboardData['occupazione']
}

// ─── Framer stagger ─────────────────────────────────────────────────────────

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const card = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
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
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Calendar size={17} className="text-indigo-500" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Oggi</p>
            <h2 className="text-[17px] font-bold text-slate-900 capitalize leading-tight tracking-tight">
              {dataEstesa}
            </h2>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/50 backdrop-blur-md border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] text-slate-600 text-[12px] font-semibold">
          <Users size={12} className="text-slate-400" />
          {oggi.inHouse} in struttura
        </div>
      </div>

      {/* ── Bento grid asimmetrico: [arrivi 2fr | occ 1fr] / [partenze 2fr | occ cont.] ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-3"
      >
        {/* Arrivi — lg: col 1-2 */}
        <motion.div variants={card} className="lg:col-span-2">
          <BentoCard
            accent="emerald"
            icon={<ArrowDownToLine size={14} strokeWidth={2.2} />}
            title="Arrivi"
            count={oggi.arrivi.totale}
            link={{ href: '/host/oggi', label: 'Vedi tutti' }}
            badges={oggi.arrivi.totale > 0 ? (
              <>
                {oggi.arrivi.checkinCompletati > 0 && (
                  <BadgePill tone="emerald" icon={<Check size={10} />}>
                    {oggi.arrivi.checkinCompletati} verif{oggi.arrivi.checkinCompletati === 1 ? 'icato' : 'icati'}
                  </BadgePill>
                )}
                {oggi.arrivi.checkinOnline > 0 && (
                  <BadgePill tone="blue" icon={<ShieldCheck size={10} />}>
                    {oggi.arrivi.checkinOnline} da verificare
                  </BadgePill>
                )}
                {oggi.arrivi.checkinMancanti > 0 && (
                  <BadgePill tone="slate" icon={<Clock size={10} />}>
                    {oggi.arrivi.checkinMancanti} in attesa
                  </BadgePill>
                )}
              </>
            ) : null}
          >
            {oggi.arrivi.totale === 0 ? (
              <EmptyState text="Nessun arrivo oggi" />
            ) : (
              <div className="max-h-[200px] overflow-y-auto">
                {oggi.arrivi.lista.map((g) => (
                  <GuestRow
                    key={g.id}
                    href={`/host/prenotazioni/${g.id}`}
                    name={`${g.guestNome} ${g.guestCognome}`}
                    subtitle={[
                      g.unitaNome ? { icon: <BedDouble size={10} />, text: g.unitaNome } : null,
                      g.numOspiti > 1 ? { icon: <Users size={10} />, text: `${g.numOspiti} ospiti` } : null,
                    ].filter(Boolean) as { icon: ReactNode; text: string }[]}
                    badge={<CheckinBadge stato={g.statoCheckIn} />}
                  />
                ))}
              </div>
            )}
          </BentoCard>
        </motion.div>

        {/* Occupazione — lg: col 3, row 1-2 */}
        <motion.div variants={card} className="lg:row-span-2">
          <BentoOccupazione occupazione={occupazione} />
        </motion.div>

        {/* Partenze — lg: col 1-2 */}
        <motion.div variants={card} className="lg:col-span-2">
          <BentoCard
            accent="blue"
            icon={<ArrowUpFromLine size={14} strokeWidth={2.2} />}
            title="Partenze"
            count={oggi.partenze.totale}
            link={{ href: '/host/oggi', label: 'Vedi tutti' }}
          >
            {oggi.partenze.totale === 0 ? (
              <EmptyState text="Nessuna partenza oggi" />
            ) : (
              <div className="max-h-[200px] overflow-y-auto">
                {oggi.partenze.lista.map((g) => (
                  <GuestRow
                    key={g.id}
                    href={`/host/prenotazioni/${g.id}`}
                    name={`${g.guestNome} ${g.guestCognome}`}
                    subtitle={g.unitaNome ? [{ icon: <BedDouble size={10} />, text: g.unitaNome }] : []}
                    badge={g.regCardFirmata
                      ? <BadgePill tone="emerald" icon={<Check size={10} />}>Checkout</BadgePill>
                      : <BadgePill tone="amber" icon={<AlertCircle size={10} />}>Manca firma</BadgePill>
                    }
                  />
                ))}
              </div>
            )}
          </BentoCard>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ─── Bento card shell ────────────────────────────────────────────────────────

const ACCENT_CFG: Record<string, { iconBg: string; iconColor: string; countBg: string; countText: string }> = {
  emerald: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', countBg: 'bg-emerald-100', countText: 'text-emerald-700' },
  blue:    { iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    countBg: 'bg-blue-100',    countText: 'text-blue-700'    },
}

function BentoCard({
  accent, icon, title, count, link, badges, children,
}: {
  accent: string
  icon: ReactNode
  title: string
  count?: number
  link?: { href: string; label: string }
  badges?: ReactNode
  children: ReactNode
}) {
  const a = ACCENT_CFG[accent] ?? ACCENT_CFG.blue
  return (
    <div className="h-full bg-white/55 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      {/* header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/50">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', a.iconBg)}>
          <span className={a.iconColor}>{icon}</span>
        </div>
        <span className="text-[14px] font-bold text-slate-800 tracking-tight">{title}</span>
        {typeof count === 'number' && (
          <span className={cn('ml-0.5 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold tabular-nums', a.countBg, a.countText)}>
            {count}
          </span>
        )}
        <div className="flex-1" />
        {link && (
          <Link href={link.href} className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors">
            {link.label} <ChevronRight size={11} />
          </Link>
        )}
      </div>
      {badges && <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-white/40">{badges}</div>}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

// ─── Occupazione card ────────────────────────────────────────────────────────

function BentoOccupazione({ occupazione }: { occupazione: DashboardData['occupazione'] }) {
  const { percentuale, unitaOccupate, unitaTotali, settimana } = occupazione
  const donutColor =
    percentuale > 90 ? '#ef4444' : percentuale > 70 ? '#f59e0b' : '#10b981'
  const donutTextColor =
    percentuale > 90 ? 'text-red-600' : percentuale > 70 ? 'text-amber-600' : 'text-emerald-600'
  const RADIUS = 46
  const CIRC = 2 * Math.PI * RADIUS
  const maxOcc = Math.max(...settimana.map((d) => d.occupate), 1)

  return (
    <div className="h-full bg-white/55 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      {/* header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/50">
        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
          <TrendingUp size={14} className="text-slate-500" strokeWidth={2.2} />
        </div>
        <span className="text-[14px] font-bold text-slate-800 tracking-tight">Occupazione</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 gap-5">
        {/* Donut */}
        <div className="relative w-[110px] h-[110px]">
          <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
            <circle cx="55" cy="55" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="9" />
            <circle
              cx="55" cy="55" r={RADIUS}
              fill="none"
              stroke={donutColor}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - percentuale / 100)}
              style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1), stroke 300ms ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-[30px] font-bold tabular-nums tracking-[-0.03em] leading-none', donutTextColor)}>
              {percentuale}%
            </span>
          </div>
        </div>

        <p className="text-[12px] font-medium text-slate-400 -mt-2 tabular-nums">
          {unitaOccupate} / {unitaTotali} camere
        </p>

        {/* Bar chart 7 giorni */}
        {settimana.length > 0 && (
          <div className="w-full">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-3 text-center">
              Prossimi 7 giorni
            </p>
            <div className="flex items-end justify-center gap-1.5">
              {settimana.slice(0, 7).map((day, i) => {
                const barH = maxOcc > 0 ? (day.occupate / maxOcc) * 72 : 0
                const isToday = i === 0
                return (
                  <div
                    key={day.data}
                    className="group relative flex flex-col items-center gap-1.5"
                    title={`${isToday ? 'Oggi' : day.giorno}: ${day.occupate}/${day.totali}`}
                  >
                    <div className="flex items-end h-[72px]">
                      <div
                        className={cn(
                          'w-[22px] rounded-t transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                          isToday ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-slate-200 group-hover:bg-slate-300',
                        )}
                        style={{ height: `${Math.max(barH, 3)}px` }}
                      />
                    </div>
                    <span className={cn('text-[10px] leading-none tabular-nums', isToday ? 'font-bold text-slate-700' : 'text-slate-400')}>
                      {day.giorno.charAt(0).toUpperCase()}
                    </span>
                    <span
                      role="tooltip"
                      className="absolute bottom-full mb-1 px-2 py-1 bg-slate-800 text-white text-[11px] font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 tabular-nums"
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
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/40 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 truncate">{name}</p>
        {subtitle.length > 0 && (
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
            {subtitle.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-0.5">{s.icon}{s.text}</span>
            ))}
          </div>
        )}
      </div>
      {badge}
      <ChevronRight size={13} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )
}

// ─── Badges ──────────────────────────────────────────────────────────────────

const TONE_CLS: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/60',
  blue:    'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/60',
  amber:   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60',
  slate:   'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/60',
}

function BadgePill({ tone, icon, children }: { tone: string; icon: ReactNode; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0', TONE_CLS[tone] ?? TONE_CLS.slate)}>
      {icon}{children}
    </span>
  )
}

function CheckinBadge({ stato }: { stato: string }) {
  switch (stato) {
    case 'VERIFICATO':           return <BadgePill tone="emerald" icon={<Check size={10} />}>Verificato</BadgePill>
    case 'ONLINE_COMPLETATO':    return <BadgePill tone="blue" icon={<ShieldCheck size={10} />}>Da verificare</BadgePill>
    default:                     return <BadgePill tone="slate" icon={<Clock size={10} />}>In attesa</BadgePill>
  }
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
      <div className="w-10 h-10 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200/60 flex items-center justify-center">
        <Check size={18} className="text-slate-300" />
      </div>
      <p className="text-[12px] text-slate-400 font-medium">{text}</p>
    </div>
  )
}
