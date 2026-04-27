/**
 * Badge — status / count / tag con palette soft.
 *
 * Design rules:
 *   - Font 11px semibold uppercase, letter-spacing 0.02em
 *   - Height 20px (sm) o 24px (md), padding 0 8px
 *   - Radius full (pillola), nessun bordo — solo background colorato
 *   - Icona opzionale 12px prima del testo
 *
 * Palette (soft, non saturi):
 *   success purple pink teal amber info warning error neutral
 *
 * Varianti:
 *   - status: pill con testo (+ dot opzionale, + pulse per stati "live")
 *   - count:  cerchio numerico (18/22 px). Clamp a "99+".
 *   - tag:    pill + bottone X a destra (removable)
 *
 * Back-compat: 27 file usano il componente. Manteniamo i colori legacy
 * (green/yellow/red/blue/gray/brand) mappati ai nuovi nomi.
 */
import { forwardRef, type ReactNode, type MouseEvent } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────────────────
// Colors
// ────────────────────────────────────────────────────────────────────────────

export type BadgeColor =
  | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  | 'purple'  | 'pink'    | 'teal'  | 'amber' | 'primary'
  // Legacy aliases (mantieni funzionanti i 27 file esistenti)
  | 'brand' | 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'orange'

/** @deprecated Usa `BadgeColor`. */
export type BadgeVariant = 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'orange'

type ColorTokens = { bg: string; text: string; dot: string }

// Palette NEW (soft — bg-50 / text-700 / dot-500)
const COLORS: Record<BadgeColor, ColorTokens> = {
  success: { bg: 'bg-success-50',  text: 'text-success-700',  dot: 'bg-success-500' },
  warning: { bg: 'bg-warning-50',  text: 'text-warning-700',  dot: 'bg-warning-500' },
  error:   { bg: 'bg-error-50',    text: 'text-error-700',    dot: 'bg-error-500'   },
  info:    { bg: 'bg-info-50',     text: 'text-info-700',     dot: 'bg-info-500'    },
  neutral: { bg: 'bg-neutral-100', text: 'text-neutral-600',  dot: 'bg-neutral-400' },
  purple:  { bg: 'bg-violet-50',   text: 'text-violet-700',   dot: 'bg-violet-500'  },
  pink:    { bg: 'bg-pink-50',     text: 'text-pink-700',     dot: 'bg-pink-500'    },
  teal:    { bg: 'bg-teal-50',     text: 'text-teal-700',     dot: 'bg-teal-500'    },
  amber:   { bg: 'bg-amber-50',    text: 'text-amber-800',    dot: 'bg-amber-500'   },
  primary: { bg: 'bg-primary-50',  text: 'text-primary-700',  dot: 'bg-primary-500' },
  // Legacy aliases
  brand:   { bg: 'bg-primary-50',  text: 'text-primary-700',  dot: 'bg-primary-500' },
  gray:    { bg: 'bg-neutral-100', text: 'text-neutral-600',  dot: 'bg-neutral-400' },
  green:   { bg: 'bg-success-50',  text: 'text-success-700',  dot: 'bg-success-500' },
  yellow:  { bg: 'bg-warning-50',  text: 'text-warning-700',  dot: 'bg-warning-500' },
  red:     { bg: 'bg-error-50',    text: 'text-error-700',    dot: 'bg-error-500'   },
  blue:    { bg: 'bg-info-50',     text: 'text-info-700',     dot: 'bg-info-500'    },
  orange:  { bg: 'bg-warning-50',  text: 'text-warning-700',  dot: 'bg-warning-500' },
}

// ────────────────────────────────────────────────────────────────────────────
// Sizes
// ────────────────────────────────────────────────────────────────────────────

type Size = 'sm' | 'md'

// Font 11px uppercase per entrambi — cambia solo l'altezza/padding.
const SIZE_PILL: Record<Size, string> = {
  sm: 'h-5 px-2 gap-1',    // 20 px
  md: 'h-6 px-2 gap-1.5',  // 24 px (default)
}

const SIZE_COUNT: Record<Size, string> = {
  sm: 'min-w-[18px] h-[18px] px-1 text-[10px]',
  md: 'min-w-[22px] h-[22px] px-1.5 text-[11px]',
}

const DOT_SIZE = 'w-1.5 h-1.5'      // 6px
const ICON_SIZE = 12

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface BadgeProps {
  children?: ReactNode
  /** 'status' (default) | 'count' | 'tag'. Accetta anche i color-string legacy per back-compat. */
  variant?: 'status' | 'count' | 'tag' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'orange' | 'gray'
  color?: BadgeColor
  size?: Size
  /** Mostra un pallino 6px prima del testo (default true su 'status') */
  dot?: boolean
  /** Fa pulsare il pallino — per stati "live" (es. check-in appena arrivato) */
  pulse?: boolean
  /** Icona LucideIcon 12px prima del testo (esclusa in variant='count'). Ha priorità sul dot. */
  icon?: LucideIcon
  /** Variant='tag': mostra bottone X cliccabile */
  removable?: boolean
  onRemove?: () => void
  className?: string
  title?: string
}

// Legacy: se `variant` è una stringa colore (es. 'green'), interpreta come tag con quel colore.
const LEGACY_VARIANT_TO_COLOR: Partial<Record<NonNullable<BadgeProps['variant']>, BadgeColor>> = {
  green: 'success', yellow: 'warning', red: 'error', blue: 'info',
  purple: 'purple', orange: 'warning', gray: 'neutral',
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { children, variant = 'status', color, size = 'md', dot, pulse, icon: Icon, removable, onRemove, className, title },
  ref,
) {
  // Risoluzione legacy: se variant è un color-string, normalizza.
  const legacyColor = LEGACY_VARIANT_TO_COLOR[variant as keyof typeof LEGACY_VARIANT_TO_COLOR]
  const resolvedColor: BadgeColor = color ?? legacyColor ?? 'neutral'
  const resolvedVariant: 'status' | 'count' | 'tag' =
    variant === 'count' ? 'count' :
    variant === 'tag' ? 'tag' :
    legacyColor ? 'tag' :
    'status'

  const c = COLORS[resolvedColor] ?? COLORS.neutral

  // ── Count variant (cerchio con numero)
  if (resolvedVariant === 'count') {
    // Clamp a "99+" se numerico
    let content = children
    if (typeof children === 'number') {
      content = children > 99 ? '99+' : String(children)
    } else if (typeof children === 'string' && /^\d+$/.test(children)) {
      const n = parseInt(children, 10)
      content = n > 99 ? '99+' : children
    }
    return (
      <span
        ref={ref}
        title={title}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-bold leading-none tabular-nums',
          SIZE_COUNT[size],
          c.bg,
          c.text,
          className,
        )}
      >
        {content}
      </span>
    )
  }

  // ── Status / Tag (pill)
  const showDot = !Icon && (resolvedVariant === 'status' ? (dot ?? true) : !!dot)

  return (
    <span
      ref={ref}
      title={title}
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase whitespace-nowrap',
        'text-[11px] leading-none tracking-[0.02em]',
        SIZE_PILL[size],
        c.bg,
        c.text,
        className,
      )}
    >
      {showDot && (
        <span className="relative inline-flex shrink-0">
          <span className={cn('rounded-full', DOT_SIZE, c.dot)} />
          {pulse && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-0 rounded-full animate-pulseDot',
                c.dot,
                'opacity-70',
              )}
            />
          )}
        </span>
      )}
      {Icon && <Icon aria-hidden="true" width={ICON_SIZE} height={ICON_SIZE} className="shrink-0" />}
      {children}
      {resolvedVariant === 'tag' && removable && (
        <button
          type="button"
          onClick={(e: MouseEvent) => { e.stopPropagation(); onRemove?.() }}
          aria-label="Rimuovi"
          className="ml-0.5 -mr-1 p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 transition-opacity"
        >
          <X width={ICON_SIZE} height={ICON_SIZE} strokeWidth={2.5} />
        </button>
      )}
    </span>
  )
})

Badge.displayName = 'Badge'

export default Badge

// ────────────────────────────────────────────────────────────────────────────
// StatusBadge — drop-in da una mappa di status-config
// Uso:
//   import { StatusBadge } from '@/components/ui/badge'
//   import { PRENOTAZIONE_STATUS } from '@/lib/status-config'
//   <StatusBadge map={PRENOTAZIONE_STATUS} status={p.stato} />
// ────────────────────────────────────────────────────────────────────────────

import type { BadgeConfig } from '@/lib/status-config'
import { getStatusConfig } from '@/lib/status-config'

export function StatusBadge({
  map,
  status,
  size = 'md',
}: {
  map: Record<string, BadgeConfig>
  status: string
  size?: 'sm' | 'md'
}) {
  const cfg = getStatusConfig(map, status)
  return (
    <Badge variant="status" color={cfg.color} pulse={cfg.pulse} icon={cfg.icon} size={size}>
      {cfg.label}
    </Badge>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Legacy status mappings — mantieni funzionante /host/prenotazioni ecc.
// NUOVO CODICE: usa `lib/status-badges.ts` (PRENOTAZIONE_BADGES, ecc.).
// ────────────────────────────────────────────────────────────────────────────

/** @deprecated Usa lib/status-badges.ts */
export type StatusConfig = { color: BadgeColor; label: string }

import {
  PRENOTAZIONE_BADGES, HK_BADGES, MANUTENZIONE_BADGES,
  SPA_APPUNTAMENTO_BADGES, FATTURA_BADGES, TICKET_BADGES, TRACE_BADGES,
} from '@/lib/status-badges'

/** @deprecated Usa PRENOTAZIONE_BADGES da lib/status-badges.ts */
export const STATO_PRENOTAZIONE: Record<string, StatusConfig> = Object.fromEntries(
  Object.entries(PRENOTAZIONE_BADGES).map(([k, v]) => [k, { color: v.color, label: v.label }]),
)

/** @deprecated Usa HK_BADGES */
export const STATO_HK: Record<string, StatusConfig> = Object.fromEntries(
  Object.entries(HK_BADGES).map(([k, v]) => [k, { color: v.color, label: v.label }]),
)

/** @deprecated Usa MANUTENZIONE_BADGES */
export const STATO_MANUTENZIONE: Record<string, StatusConfig> = Object.fromEntries(
  Object.entries(MANUTENZIONE_BADGES).map(([k, v]) => [k, { color: v.color, label: v.label }]),
)

/** @deprecated Usa SPA_APPUNTAMENTO_BADGES */
export const STATO_APPUNTAMENTO_SPA: Record<string, StatusConfig> = Object.fromEntries(
  Object.entries(SPA_APPUNTAMENTO_BADGES).map(([k, v]) => [k, { color: v.color, label: v.label }]),
)

/** @deprecated Usa FATTURA_BADGES */
export const STATO_FATTURA: Record<string, StatusConfig> = Object.fromEntries(
  Object.entries(FATTURA_BADGES).map(([k, v]) => [k, { color: v.color, label: v.label }]),
)

/** @deprecated Usa TICKET_BADGES */
export const STATO_TICKET: Record<string, StatusConfig> = Object.fromEntries(
  Object.entries(TICKET_BADGES).map(([k, v]) => [k, { color: v.color, label: v.label }]),
)

/** @deprecated Usa TRACE_BADGES */
export const STATO_TRACE: Record<string, StatusConfig> = Object.fromEntries(
  Object.entries(TRACE_BADGES).map(([k, v]) => [k, { color: v.color, label: v.label }]),
)

/** @deprecated Usa getBadgeConfig() da lib/status-badges.ts */
export function getStatoConfig(stato: string): StatusConfig {
  return STATO_PRENOTAZIONE[stato]
    || STATO_HK[stato]
    || STATO_MANUTENZIONE[stato]
    || STATO_APPUNTAMENTO_SPA[stato]
    || STATO_FATTURA[stato]
    || STATO_TICKET[stato]
    || STATO_TRACE[stato]
    || { color: 'neutral', label: stato }
}
