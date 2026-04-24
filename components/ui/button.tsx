/**
 * Button — componente centralizzato per tutte le azioni cliccabili.
 *
 * VARIANTI
 *   primary    CTA principale (gradient indigo, border, subtle inner-shadow)
 *   secondary  Azione secondaria (bianco + border neutrale)
 *   ghost      Azione terziaria (trasparente, hover bg neutrale)
 *   danger     Azioni distruttive (rosso)
 *   success    Azioni positive (verde)
 *   outline    Secondary enfatizzato (border primary)
 *   link       Sembra un link, funziona da bottone (inline, underline on hover)
 *
 * SIZES            xs=28px · sm=32px · md=36px (default) · lg=44px
 * ICONE            iconLeft / iconRight (LucideIcon). Senza children → bottone quadrato.
 * LOADING          spinner sostituisce iconLeft; testo opacizzato; bottone disabilitato.
 * FULL WIDTH       fullWidth → w-100% con contenuto centrato.
 * POLYMORPHIC      href → <a>; altrimenti → <button type="button" di default>.
 *
 * MIGRAZIONE LEGACY
 *   I vecchi `btn-primary`/`btn-secondary`/… (in globals.css) restano attivi.
 *   Le nuove feature usano <Button>. Le vecchie pagine migrano quando vengono toccate.
 */
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type ReactNode,
} from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'outline'
  | 'link'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

// Supporta LucideIcon (e qualsiasi altro componente SVG compatibile).
type IconComponent = LucideIcon

type CommonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: IconComponent
  iconRight?: IconComponent
  loading?: boolean
  fullWidth?: boolean
  className?: string
  children?: ReactNode
}

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  keyof CommonProps | 'href'
> & { href?: undefined }

type NativeAnchorProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof CommonProps
> & { href: string }

export type ButtonProps = CommonProps & (NativeButtonProps | NativeAnchorProps)

// ────────────────────────────────────────────────────────────────────────────
// Variant + size style tables
// ────────────────────────────────────────────────────────────────────────────

// Le variant-class NON includono padding/height (vivono in SIZE_STYLES).
// Includono SOLO: colori, bordi, ombre, stati hover/active.
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: [
    // background gradient top→bottom (sottile, non glossy)
    'bg-gradient-to-b from-primary-600 to-primary-700 text-white',
    'border border-primary-700',
    // inner highlight top 1px + shadow-sm outer — dà profondità
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_3px_rgba(79,70,229,0.25)]',
    'hover:from-primary-700 hover:to-primary-800 hover:-translate-y-px',
    'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_6px_16px_-2px_rgba(79,70,229,0.3)]',
    'active:from-primary-800 active:to-primary-800 active:translate-y-0',
    'active:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(79,70,229,0.25)]',
  ].join(' '),

  secondary: [
    'bg-white text-neutral-700 border border-neutral-200 shadow-xs',
    'hover:bg-neutral-50 hover:border-neutral-300',
    'active:bg-neutral-100',
  ].join(' '),

  ghost: [
    'bg-transparent text-neutral-600 border border-transparent',
    'hover:bg-neutral-100',
    'active:bg-neutral-150',
  ].join(' '),

  danger: [
    'bg-error-600 text-white border border-error-700 shadow-sm',
    'hover:bg-error-700 hover:-translate-y-px hover:shadow-md',
    'active:bg-error-700 active:translate-y-0 active:shadow-xs',
  ].join(' '),

  success: [
    'bg-success-600 text-white border border-success-700 shadow-sm',
    'hover:bg-success-700 hover:-translate-y-px hover:shadow-md',
    'active:bg-success-700 active:translate-y-0 active:shadow-xs',
  ].join(' '),

  outline: [
    'bg-transparent text-primary-600 border border-primary-300',
    'hover:bg-primary-50 hover:border-primary-400',
    'active:bg-primary-100',
  ].join(' '),

  link: [
    // Nessun bg, nessun border, nessun padding/height (override in renderer)
    'bg-transparent text-primary-600 border-0 shadow-none p-0 h-auto',
    'hover:text-primary-700 hover:underline',
    'active:text-primary-800',
  ].join(' '),
}

type SizeConfig = {
  base: string
  iconOnly: string
  iconPx: number
  gap: string
}

const SIZE_STYLES: Record<ButtonSize, SizeConfig> = {
  xs: { base: 'h-7 px-2 text-[12px] rounded-sm',  iconOnly: 'w-7 px-0', iconPx: 12, gap: 'gap-1'   },
  sm: { base: 'h-8 px-3 text-[13px] rounded-md',  iconOnly: 'w-8 px-0', iconPx: 14, gap: 'gap-1.5' },
  md: { base: 'h-9 px-4 text-[14px] rounded-md',  iconOnly: 'w-9 px-0', iconPx: 16, gap: 'gap-2'   },
  lg: { base: 'h-11 px-6 text-[15px] rounded-lg', iconOnly: 'w-11 px-0', iconPx: 18, gap: 'gap-2'   },
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = 'primary',
      size = 'md',
      iconLeft: IconLeft,
      iconRight: IconRight,
      loading = false,
      fullWidth = false,
      className,
      children,
      ...rest
    } = props

    const hasChildren = children !== undefined && children !== null && children !== false
    const isIconOnly = !hasChildren && (IconLeft || IconRight)
    const isLink = variant === 'link'
    const sizeCfg = SIZE_STYLES[size]
    const iconPx = sizeCfg.iconPx

    // ── Classi base comuni a tutte le varianti
    const baseClasses = cn(
      'relative inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
      // transizioni (duration-fast già mappato su 120ms in tailwind config)
      'transition-all duration-fast ease-out',
      // focus ring via CSS var --shadow-focus
      'focus-visible:outline-none focus-visible:shadow-focus',
      // disabled: opacity + cursor, blocca hover/active grazie a pointer-events
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      // per <a>, `disabled` non esiste: simuliamo con aria-disabled
      'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:pointer-events-none',
    )

    // ── Size classes (skip for link variant — resta inline)
    const sizeClasses = !isLink
      ? cn(sizeCfg.base, isIconOnly && sizeCfg.iconOnly, !isIconOnly && sizeCfg.gap)
      : ''

    const classes = cn(
      baseClasses,
      VARIANT_STYLES[variant],
      sizeClasses,
      fullWidth && 'w-full',
      className,
    )

    // ── Contenuto interno
    const iconStyle = { width: iconPx, height: iconPx, flexShrink: 0 } as const

    const leftSlot = loading ? (
      <Loader2 aria-hidden="true" className="animate-spin" style={iconStyle} />
    ) : IconLeft ? (
      <IconLeft aria-hidden="true" width={iconPx} height={iconPx} style={iconStyle} />
    ) : null

    const rightSlot = !loading && IconRight ? (
      <IconRight aria-hidden="true" width={iconPx} height={iconPx} style={iconStyle} />
    ) : null

    const content = (
      <>
        {leftSlot}
        {hasChildren && (
          <span className={cn(loading && 'opacity-70')}>{children}</span>
        )}
        {rightSlot}
      </>
    )

    // ── Polymorphic render: <a> se href, altrimenti <button>
    if ('href' in props && typeof props.href === 'string') {
      const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>
      const isDisabled = loading || anchorProps['aria-disabled'] === true || anchorProps['aria-disabled'] === 'true'
      return (
        <a
          ref={ref as ForwardedRef<HTMLAnchorElement>}
          className={classes}
          aria-disabled={isDisabled || undefined}
          // Quando "disabled", disattiva la navigazione ma mantieni il nodo
          onClick={isDisabled ? (e) => e.preventDefault() : anchorProps.onClick}
          {...anchorProps}
          href={props.href}
        >
          {content}
        </a>
      )
    }

    const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>
    return (
      <button
        ref={ref as ForwardedRef<HTMLButtonElement>}
        type={buttonProps.type ?? 'button'}
        disabled={loading || buttonProps.disabled}
        aria-busy={loading || undefined}
        className={classes}
        {...buttonProps}
      >
        {content}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button
