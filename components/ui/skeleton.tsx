import { cn } from '@/lib/utils'

// ─── Base skeleton ──────────────────────────────────────────────────────────

const ROUNDED: Record<string, string> = {
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  full: 'rounded-full',
}

interface BaseProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

function Base({ className, rounded = 'md' }: BaseProps) {
  return <div className={cn('skeleton-shimmer', ROUNDED[rounded], className)} />
}

// ─── Variants ───────────────────────────────────────────────────────────────

function Text({ width, className }: { width?: string; className?: string }) {
  return <Base className={cn('h-4', className)} style-width={width} rounded="sm" />
}

function TextSm({ width, className }: { width?: string; className?: string }) {
  return <Base className={cn('h-3', className)} style-width={width} rounded="sm" />
}

function Circle({ size = 40, className }: { size?: number; className?: string }) {
  return <Base className={className} rounded="full" style-size={size} />
}

function Rect({ width, height, className, rounded }: {
  width?: number | string; height?: number | string; className?: string; rounded?: BaseProps['rounded']
}) {
  return <Base className={className} rounded={rounded || 'lg'} style-wh={{ width, height }} />
}

function Button({ className }: { className?: string }) {
  return <Base className={cn('h-10 w-32', className)} rounded="lg" />
}

// We need to use inline styles for dynamic widths. Let me rewrite with proper style prop:

// ─── Proper implementation with style ───────────────────────────────────────

function SkeletonBase({ className, rounded = 'md', style }: BaseProps & { style?: React.CSSProperties }) {
  return <div className={cn('skeleton-shimmer', ROUNDED[rounded], className)} style={style} />
}

/** Single-line text placeholder */
function SkeletonText({ width, className }: { width?: string | number; className?: string }) {
  return <SkeletonBase className={cn('h-4', className)} rounded="sm" style={width ? { width } : undefined} />
}

/** Small text placeholder */
function SkeletonTextSm({ width, className }: { width?: string | number; className?: string }) {
  return <SkeletonBase className={cn('h-3', className)} rounded="sm" style={width ? { width } : undefined} />
}

/** Circle placeholder (avatar) */
function SkeletonCircle({ size = 40, className }: { size?: number; className?: string }) {
  return <SkeletonBase className={className} rounded="full" style={{ width: size, height: size }} />
}

/** Rectangle placeholder (image, card) */
function SkeletonRect({ width, height, className, rounded }: {
  width?: number | string; height?: number | string; className?: string; rounded?: BaseProps['rounded']
}) {
  return <SkeletonBase className={className} rounded={rounded || 'lg'} style={{ width, height }} />
}

/** Button placeholder */
function SkeletonButton({ className }: { className?: string }) {
  return <SkeletonBase className={cn('h-10 w-32', className)} rounded="lg" />
}

/** Avatar squadrato 34px (radius-lg) — usato negli arrivi/partenze guest cards */
function SkeletonAvatar({ size = 34, className }: { size?: number; className?: string }) {
  return <SkeletonBase className={className} rounded="lg" style={{ width: size, height: size }} />
}

// ─── Compound export ────────────────────────────────────────────────────────

export const Skeleton = Object.assign(SkeletonBase, {
  Text: SkeletonText,
  TextSm: SkeletonTextSm,
  Circle: SkeletonCircle,
  Rect: SkeletonRect,
  Button: SkeletonButton,
  Avatar: SkeletonAvatar,
})

// ─── Preset composites (backward compatible) ────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <Skeleton.Text width="33%" />
      <Skeleton.Text width="66%" />
      <Skeleton.Text width="50%" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton.Rect height={40} className="w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 flex-1" rounded="md" />
          <Skeleton className="h-8 w-24" rounded="md" />
          <Skeleton className="h-8 w-20 hidden md:block" rounded="md" />
          <Skeleton className="h-8 w-16 hidden lg:block" rounded="md" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <Skeleton.TextSm width="50%" />
          <Skeleton.Rect height={28} width="66%" />
        </div>
      ))}
    </div>
  )
}
