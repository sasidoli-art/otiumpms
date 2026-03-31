import { cn } from '@/lib/utils'

export type BadgeVariant = 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'orange'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: BadgeVariant
}

export function Badge({ children, className, variant = 'gray' }: BadgeProps) {
  return (
    <span className={cn('badge', variant, className)}>
      {children}
    </span>
  )
}
