import { Skeleton } from '@/components/ui/skeleton'

export function PrenotazioniSkeleton() {
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton.Text width="30%" className="h-6" />
        <Skeleton.Button />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton.Rect key={i} width={80} height={32} rounded="full" />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-hidden bg-[var(--bg-elevated)]">
        {/* Header row */}
        <div className="flex items-center gap-4 px-4 py-3 bg-[var(--bg-secondary)]">
          <Skeleton.TextSm width="15%" />
          <Skeleton.TextSm width="20%" />
          <Skeleton.TextSm width="15%" className="hidden md:block" />
          <Skeleton.TextSm width="10%" className="hidden md:block" />
          <Skeleton.TextSm width="10%" className="hidden lg:block" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-t border-[var(--border-default)]">
            <div className="flex items-center gap-3 flex-1" style={{ maxWidth: '35%' }}>
              <Skeleton.Circle size={32} />
              <div className="space-y-1 flex-1">
                <Skeleton.Text width={`${55 + Math.random() * 30}%`} />
                <Skeleton.TextSm width={`${40 + Math.random() * 20}%`} />
              </div>
            </div>
            <Skeleton.Text width="18%" />
            <Skeleton.Rect width={70} height={22} rounded="full" className="hidden md:block" />
            <Skeleton.Text width="12%" className="hidden md:block" />
            <Skeleton.Rect width={60} height={22} rounded="full" className="hidden lg:block" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton.TextSm width={100} />
        <div className="flex gap-2">
          <Skeleton.Rect width={80} height={28} />
          <Skeleton.Rect width={32} height={28} />
          <Skeleton.Rect width={32} height={28} />
        </div>
      </div>
    </div>
  )
}
