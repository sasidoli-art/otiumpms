import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Color tokens ───────────────────────────────────────────────────────────

type BadgeColor = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'gray'

/** @deprecated Use BadgeColor instead */
export type BadgeVariant = 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'orange'

const COLOR_MAP: Record<BadgeColor, { bg: string; text: string; dot: string }> = {
  brand:   { bg: 'bg-brand-50 dark:bg-brand-950/30',       text: 'text-brand-700 dark:text-brand-300',     dot: 'bg-brand-500' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-950/30',   text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-950/30',       text: 'text-amber-700 dark:text-amber-400',     dot: 'bg-amber-500' },
  error:   { bg: 'bg-red-50 dark:bg-red-950/30',           text: 'text-red-700 dark:text-red-400',         dot: 'bg-red-500' },
  info:    { bg: 'bg-blue-50 dark:bg-blue-950/30',         text: 'text-blue-700 dark:text-blue-400',       dot: 'bg-blue-500' },
  gray:    { bg: 'bg-slate-100 dark:bg-slate-800',         text: 'text-slate-600 dark:text-slate-400',     dot: 'bg-slate-400' },
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode
  /** New API: 'status' | 'count' | 'tag'. Legacy: color string like 'gray', 'green', 'red' */
  variant?: 'status' | 'count' | 'tag' | BadgeVariant
  color?: BadgeColor
  size?: 'sm' | 'md'
  dot?: boolean
  removable?: boolean
  onRemove?: () => void
  className?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

// Legacy variant → color mapping
const LEGACY_MAP: Record<string, BadgeColor> = {
  gray: 'gray', yellow: 'warning', green: 'success', red: 'error',
  blue: 'info', purple: 'brand', orange: 'warning',
}

export function Badge({
  children, variant = 'tag', color,
  size = 'md', dot, removable, onRemove, className,
}: BadgeProps) {
  // Detect legacy usage: variant is a color string like "gray", "green"
  const isLegacyVariant = variant && LEGACY_MAP[variant] !== undefined
  const resolvedColor = color || (isLegacyVariant ? LEGACY_MAP[variant] : 'gray') || 'gray'
  const resolvedVariant = isLegacyVariant ? 'tag' : variant

  const c = COLOR_MAP[resolvedColor]
  const isSmall = size === 'sm'

  // ── Count badge (circle with number) ──
  if (resolvedVariant === 'count') {
    return (
      <span className={cn(
        'inline-flex items-center justify-center rounded-full font-bold leading-none',
        isSmall ? 'min-w-[16px] h-4 px-1 text-[9px]' : 'min-w-[20px] h-5 px-1.5 text-[10px]',
        c.bg, c.text,
        className,
      )}>
        {children}
      </span>
    )
  }

  // ── Status badge (dot + text) ──
  if (resolvedVariant === 'status') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        c.bg, c.text,
        className,
      )}>
        {dot !== false && (
          <span className={cn('rounded-full shrink-0', isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2', c.dot)} />
        )}
        {children}
      </span>
    )
  }

  // ── Tag badge (chip) ──
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-semibold',
      isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      c.bg, c.text,
      className,
    )}>
      {children}
      {removable && (
        <button
          onClick={e => { e.stopPropagation(); onRemove?.() }}
          className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
        >
          <X size={isSmall ? 10 : 12} />
        </button>
      )}
    </span>
  )
}

// ─── Status mappings ────────────────────────────────────────────────────────

export type StatusConfig = { color: BadgeColor; label: string }

export const STATO_PRENOTAZIONE: Record<string, StatusConfig> = {
  RICHIESTA:  { color: 'warning', label: 'Da confermare' },
  CONFERMATA: { color: 'success', label: 'Confermata' },
  ANNULLATA:  { color: 'error',   label: 'Annullata' },
  COMPLETATA: { color: 'info',    label: 'Completata' },
  NO_SHOW:    { color: 'gray',    label: 'No show' },
}

export const STATO_HK: Record<string, StatusConfig> = {
  PULITA:          { color: 'success', label: 'Pulita' },
  SPORCA:          { color: 'error',   label: 'Sporca' },
  IN_PULIZIA:      { color: 'warning', label: 'In pulizia' },
  NON_DISTURBARE:  { color: 'info',    label: 'Non disturb.' },
  MANUTENZIONE:    { color: 'brand',   label: 'Manutenzione' },
  FUORI_SERVIZIO:  { color: 'gray',    label: 'Fuori servizio' },
}

export const STATO_MANUTENZIONE: Record<string, StatusConfig> = {
  APERTA:            { color: 'error',   label: 'Aperta' },
  IN_LAVORAZIONE:    { color: 'warning', label: 'In lavorazione' },
  IN_ATTESA_PARTI:   { color: 'info',    label: 'Attesa parti' },
  RISOLTA:           { color: 'success', label: 'Risolta' },
  ANNULLATA:         { color: 'gray',    label: 'Annullata' },
}

export const STATO_APPUNTAMENTO_SPA: Record<string, StatusConfig> = {
  PRENOTATO:  { color: 'info',    label: 'Prenotato' },
  CONFERMATO: { color: 'success', label: 'Confermato' },
  IN_CORSO:   { color: 'brand',   label: 'In corso' },
  COMPLETATO: { color: 'gray',    label: 'Completato' },
  ANNULLATO:  { color: 'error',   label: 'Annullato' },
  NO_SHOW:    { color: 'warning', label: 'No show' },
}

export const STATO_FATTURA: Record<string, StatusConfig> = {
  BOZZA:    { color: 'gray',    label: 'Bozza' },
  EMESSA:   { color: 'info',    label: 'Emessa' },
  INVIATA:  { color: 'brand',   label: 'Inviata' },
  PAGATA:   { color: 'success', label: 'Pagata' },
  SCADUTA:  { color: 'error',   label: 'Scaduta' },
  ANNULLATA:{ color: 'gray',    label: 'Annullata' },
}

export const STATO_TICKET: Record<string, StatusConfig> = {
  APERTO:              { color: 'error',   label: 'Aperto' },
  IN_LAVORAZIONE:      { color: 'warning', label: 'In lavorazione' },
  IN_ATTESA_RISPOSTA:  { color: 'info',    label: 'Attesa risposta' },
  RISOLTO:             { color: 'success', label: 'Risolto' },
  CHIUSO:              { color: 'gray',    label: 'Chiuso' },
}

export const STATO_TRACE: Record<string, StatusConfig> = {
  APERTO:     { color: 'error',   label: 'Aperto' },
  IN_CORSO:   { color: 'warning', label: 'In corso' },
  COMPLETATO: { color: 'success', label: 'Completato' },
  ANNULLATO:  { color: 'gray',    label: 'Annullato' },
}

/** Helper: get badge config for any stato value across all enums */
export function getStatoConfig(stato: string): StatusConfig {
  return STATO_PRENOTAZIONE[stato]
    || STATO_HK[stato]
    || STATO_MANUTENZIONE[stato]
    || STATO_APPUNTAMENTO_SPA[stato]
    || STATO_FATTURA[stato]
    || STATO_TICKET[stato]
    || STATO_TRACE[stato]
    || { color: 'gray', label: stato }
}
