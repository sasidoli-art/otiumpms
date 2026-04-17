import { cn } from '@/lib/utils'

type DotColor = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'gray'

const DOT_COLORS: Record<DotColor, string> = {
  brand:   'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
  info:    'bg-blue-500',
  gray:    'bg-slate-400 dark:bg-slate-500',
}

interface Props {
  color?: DotColor
  pulse?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function StatusDot({ color = 'gray', pulse, size = 'md', className }: Props) {
  const isSmall = size === 'sm'

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span className={cn(
        'rounded-full',
        isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2',
        DOT_COLORS[color],
      )} />
      {pulse && (
        <span className={cn(
          'absolute inset-0 rounded-full animate-ping opacity-75',
          isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2',
          DOT_COLORS[color],
        )} />
      )}
    </span>
  )
}
