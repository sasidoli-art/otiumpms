import { forwardRef, type ReactNode, type ElementType } from 'react'
import { cn } from '@/lib/utils'

// ─── Accent color map ───────────────────────────────────────────────────────

const ACCENT_COLORS: Record<string, string> = {
  brand:   'border-l-brand-500',
  success: 'border-l-emerald-500',
  warning: 'border-l-amber-500',
  error:   'border-l-red-500',
  info:    'border-l-blue-500',
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  variant?: 'default' | 'interactive' | 'accent' | 'flat'
  accentColor?: 'brand' | 'success' | 'warning' | 'error' | 'info' | (string & {})
  padding?: 'sm' | 'md' | 'lg' | 'none'
  className?: string
  onClick?: () => void
  as?: 'div' | 'article' | 'section' | 'a'
  href?: string
}

const PADDING: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

// ─── Component ──────────────────────────────────────────────────────────────

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, variant = 'default', accentColor, padding = 'md', className, onClick, as, href, ...rest },
  ref,
) {
  const isInteractive = variant === 'interactive' || !!onClick
  const Tag = (as || (href ? 'a' : 'div')) as ElementType

  const accentClass = accentColor
    ? ACCENT_COLORS[accentColor] || `border-l-[${accentColor}]`
    : ''

  const base = cn(
    // All variants
    'rounded-[var(--radius-lg)] transition-all',
    PADDING[padding],

    // Default
    variant === 'default' && 'bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-card)]',

    // Interactive
    isInteractive && 'bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-card)] cursor-pointer hover:shadow-[var(--shadow-md)] hover:border-[var(--border-hover)] active:scale-[0.99]',

    // Accent
    variant === 'accent' && cn(
      'bg-[var(--bg-elevated)] border border-[var(--border-default)] border-l-[3px]',
      accentClass,
    ),

    // Flat
    variant === 'flat' && 'bg-[var(--bg-secondary)]',

    className,
  )

  return (
    <Tag ref={ref} className={base} onClick={onClick} href={href} {...rest}>
      {children}
    </Tag>
  )
})
