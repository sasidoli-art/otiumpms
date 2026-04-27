/**
 * Card — container principale della UI.
 *
 * VARIANTI
 *   default      Static container (bg bianco, border sottile, shadow-xs).
 *   interactive  Cliccabile. Hover translateY(-1px) + shadow-md. Focus ring.
 *   selected     Radio-card selezionata: border primary + ring 1px — ZERO layout
 *                shift rispetto allo stato non-selezionato. Check overlay in alto dx.
 *   accent       Bordo laterale sinistro colorato (3px) + bg leggermente tintato.
 *   glass        Trasparente + backdrop-blur, per overlay su immagini (hero, kiosk).
 *   flush        Senza border/shadow, bg surface-secondary. Per sezioni interne.
 *
 * HEADER (opzionale)
 *   Prop `header` rende un'intestazione con icona + title+subtitle a sinistra e
 *   `action` a destra, separata dal body con border-bottom subtle.
 *
 * BACK-COMPAT
 *   - `variant="flat"` → alias di `flush` (legacy)
 *   - `padding="none"` continua a lavorare
 *   - Props `as`, `href`, `onClick` invariati
 */
'use client'

import { forwardRef, type ReactNode, type ElementType } from 'react'
import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

export type CardVariant =
  | 'default'
  | 'interactive'
  | 'selected'
  | 'accent'
  | 'glass'
  | 'flush'
  | 'kpi' // metric card con sfondo gradient (P1.1 design system)
  | 'flat' // @deprecated alias di flush

export type CardAccentColor = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'accent'

export type CardKpiColor = 'indigo' | 'green' | 'amber' | 'violet' | 'rose' | 'teal'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export type CardHeader = {
  title: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
}

export interface CardProps {
  children?: ReactNode
  variant?: CardVariant
  /** Usato solo con variant="accent" */
  accentColor?: CardAccentColor | (string & {})
  /** Usato solo con variant="kpi" — sfondo gradient delicato */
  kpiColor?: CardKpiColor
  padding?: CardPadding
  /** Intestazione strutturata (icona + title/subtitle + action a destra) */
  header?: CardHeader
  /** Per variant="selected" mostra un check overlay in alto a destra */
  showSelectedIndicator?: boolean
  className?: string
  onClick?: () => void
  as?: 'div' | 'article' | 'section' | 'a' | 'button'
  href?: string
  /** aria-label per card interactive/selected che fungono da bottone */
  ariaLabel?: string
}

// ─── Style tables ───────────────────────────────────────────────────────────

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',  // 16px
  md: 'p-5',  // 20px (default spec)
  lg: 'p-6',  // 24px
}

const ACCENT_BORDER_CLASSES: Record<CardAccentColor, string> = {
  primary: 'border-l-primary-500 bg-primary-50/40',
  success: 'border-l-success-500 bg-success-50/40',
  warning: 'border-l-warning-500 bg-warning-50/40',
  error:   'border-l-error-500 bg-error-50/40',
  info:    'border-l-info-500 bg-info-50/40',
  accent:  'border-l-accent-500 bg-accent-50/40',
}

// ─── Component ──────────────────────────────────────────────────────────────

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  {
    children,
    variant = 'default',
    accentColor,
    kpiColor,
    padding = 'md',
    header,
    showSelectedIndicator,
    className,
    onClick,
    as,
    href,
    ariaLabel,
    ...rest
  },
  ref,
) {
  // flat → flush alias
  const v: Exclude<CardVariant, 'flat'> = variant === 'flat' ? 'flush' : variant
  const isInteractive = v === 'interactive' || !!onClick || !!href

  const Tag = (as || (href ? 'a' : isInteractive ? 'button' : 'div')) as ElementType

  // Header is separated from body by a divider; when header exists the root
  // card gets padding=0 and header/body wrappers get internal padding.
  const hasStructuredHeader = !!header
  const rootPadding = hasStructuredHeader ? PADDING_CLASSES.none : PADDING_CLASSES[padding]

  const variantClasses = {
    default: cn(
      'bg-white border border-neutral-150 shadow-xs',
    ),
    interactive: cn(
      'bg-white border border-neutral-150 shadow-xs cursor-pointer',
      'transition-all duration-normal ease-out',
      'hover:shadow-md hover:border-neutral-300 hover:-translate-y-px',
      'active:shadow-xs active:translate-y-0',
      'focus-visible:outline-none focus-visible:shadow-focus',
    ),
    selected: cn(
      // Border 1px primary + ring 1px primary-200 → NO layout shift
      'bg-primary-50 border border-primary-500',
      'shadow-[0_0_0_1px_var(--color-primary-200)]',
      'transition-all duration-normal ease-out',
      // Se anche cliccabile (es. radio card)
      isInteractive && 'cursor-pointer hover:shadow-[0_0_0_1px_var(--color-primary-300),var(--shadow-sm)]',
      isInteractive && 'focus-visible:outline-none focus-visible:shadow-focus',
    ),
    accent: cn(
      'bg-white border border-neutral-150 shadow-xs',
      'border-l-[3px]',
      accentColor && (accentColor in ACCENT_BORDER_CLASSES
        ? ACCENT_BORDER_CLASSES[accentColor as CardAccentColor]
        : `border-l-[${accentColor}]`),
    ),
    glass: cn(
      'bg-white/70 border border-white/40 shadow-lg',
      '[backdrop-filter:blur(16px)_saturate(180%)]',
      '[-webkit-backdrop-filter:blur(16px)_saturate(180%)]',
    ),
    flush: cn(
      'bg-neutral-50',
    ),
    kpi: cn(
      'border border-neutral-150',
      // Background gradient via Tailwind utility (vedi tailwind.config.ts → backgroundImage)
      kpiColor === 'green'  ? 'bg-kpi-green'  :
      kpiColor === 'amber'  ? 'bg-kpi-amber'  :
      kpiColor === 'violet' ? 'bg-kpi-violet' :
      kpiColor === 'rose'   ? 'bg-kpi-rose'   :
      kpiColor === 'teal'   ? 'bg-kpi-teal'   :
      'bg-kpi-indigo', // default = indigo
    ),
  }[v]

  const rootClasses = cn(
    'relative rounded-lg',
    variantClasses,
    rootPadding,
    className,
  )

  // ── Assembla contenuto
  const body = hasStructuredHeader ? (
    <div className={cn(PADDING_CLASSES[padding])}>{children}</div>
  ) : (
    children
  )

  const renderedHeader = header && (
    <header className={cn(
      'flex items-start justify-between gap-4 px-5 py-4',
      'border-b border-neutral-150',
    )}>
      <div className="flex items-start gap-3 min-w-0">
        {header.icon && (
          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-md bg-primary-50 text-primary-600 flex items-center justify-center">
            <header.icon aria-hidden="true" width={16} height={16} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-neutral-900 leading-tight truncate">
            {header.title}
          </div>
          {header.subtitle && (
            <div className="text-[12px] text-neutral-500 mt-0.5">
              {header.subtitle}
            </div>
          )}
        </div>
      </div>
      {header.action && (
        <div className="shrink-0">{header.action}</div>
      )}
    </header>
  )

  // ── Selected indicator (check in alto a destra)
  const shouldShowIndicator = v === 'selected' && (showSelectedIndicator ?? true)
  const selectedIndicator = shouldShowIndicator && (
    <span
      aria-hidden="true"
      className={cn(
        'absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-600 text-white',
        'flex items-center justify-center shadow-sm',
      )}
    >
      <Check width={12} height={12} strokeWidth={3} />
    </span>
  )

  // ── Props specifici a tag (button vs a vs div)
  const commonProps: Record<string, unknown> = {
    ref,
    className: rootClasses,
    ...rest,
  }
  if (onClick) commonProps.onClick = onClick
  if (href) commonProps.href = href
  if (ariaLabel) commonProps['aria-label'] = ariaLabel
  if (Tag === 'button') commonProps.type = 'button'

  return (
    <Tag {...commonProps}>
      {renderedHeader}
      {body}
      {selectedIndicator}
    </Tag>
  )
})

Card.displayName = 'Card'

// ─── Compound subcomponents (Card.Header, Card.Title, Card.Body, ...) ──────
// Per uso "ripugnante" senza prop `header`: <Card><Card.Header>...</Card.Header>...</Card>
// Quando si usano questi, mettere `padding="none"` sulla Card root.

function CardHeaderEl({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-3.5 border-b border-neutral-150', className)}>
      {children}
    </div>
  )
}

function CardTitle({ children, icon: Icon, className }: { children: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 text-[14px] font-semibold text-neutral-900', className)}>
      {Icon && <Icon className="w-4 h-4 text-neutral-500 shrink-0" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </div>
  )
}

function CardBadge({ children, color = 'primary' }: { children: ReactNode; color?: 'primary' | 'success' | 'info' | 'warning' | 'error' }) {
  const bg = {
    primary: 'bg-gradient-primary',
    success: 'bg-gradient-success',
    info:    'bg-gradient-info',
    warning: 'bg-gradient-warning',
    error:   'bg-gradient-error',
  }[color]
  return (
    <span className={cn('inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white', bg)}>
      {children}
    </span>
  )
}

function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 py-3', className)}>{children}</div>
}

function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 py-3 border-t border-neutral-150', className)}>{children}</div>
}

// Attach a Card per pattern compound (Card.Header, Card.Title, ...)
;(Card as unknown as Record<string, unknown>).Header = CardHeaderEl
;(Card as unknown as Record<string, unknown>).Title = CardTitle
;(Card as unknown as Record<string, unknown>).Badge = CardBadge
;(Card as unknown as Record<string, unknown>).Body = CardBody
;(Card as unknown as Record<string, unknown>).Footer = CardFooter

export { CardHeaderEl as CardHeader, CardTitle, CardBadge, CardBody, CardFooter }

// ─── CardGroup — layout responsive per card affiancate ───────────────────────

/**
 * Wrapper grid per insiemi di card. Gap 16px mobile, 20px desktop.
 * align-items stretch → tutte le card hanno stessa altezza.
 */
export function CardGroup({
  cols = 3,
  children,
  className,
}: {
  cols?: 1 | 2 | 3 | 4
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-4 md:gap-5 items-stretch',
        cols === 1 && 'grid-cols-1',
        cols === 2 && 'grid-cols-1 sm:grid-cols-2',
        cols === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

export default Card
