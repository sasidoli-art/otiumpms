import { cn } from '@/lib/utils'
import type { ElementType, ReactNode } from 'react'

interface TypoProps {
  children: ReactNode
  as?: ElementType
  className?: string
}

/** Page title — h1, 22px semibold */
export function PageTitle({ children, as: Tag = 'h1', className }: TypoProps) {
  return (
    <Tag className={cn(
      'text-[22px] font-semibold text-[var(--text-primary)] leading-tight mb-1',
      'font-heading',
      className,
    )}>
      {children}
    </Tag>
  )
}

/** Page description — 14px, secondary color */
export function PageDescription({ children, as: Tag = 'p', className }: TypoProps) {
  return (
    <Tag className={cn(
      'text-sm text-[var(--text-secondary)] mb-6',
      className,
    )}>
      {children}
    </Tag>
  )
}

/** Section title — h2, 16px medium */
export function SectionTitle({ children, as: Tag = 'h2', className }: TypoProps) {
  return (
    <Tag className={cn(
      'text-base font-medium text-[var(--text-primary)] mt-8 first:mt-0 mb-3',
      'font-heading',
      className,
    )}>
      {children}
    </Tag>
  )
}

/** Form/field label — 13px medium, secondary */
export function Label({ children, as: Tag = 'label', className, ...rest }: TypoProps & { htmlFor?: string }) {
  return (
    <Tag className={cn(
      'block text-[13px] font-medium text-[var(--text-primary)] mb-1.5',
      className,
    )} {...rest}>
      {children}
    </Tag>
  )
}

/** Help text — 12px, tertiary */
export function HelpText({ children, as: Tag = 'p', className }: TypoProps) {
  return (
    <Tag className={cn(
      'text-xs text-[var(--text-tertiary)] mt-1',
      className,
    )}>
      {children}
    </Tag>
  )
}
