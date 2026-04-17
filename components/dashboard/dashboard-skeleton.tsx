import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <Skeleton.Text width="40%" className="h-6" />

      {/* Quick actions */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton.Rect key={i} width={80} height={64} />
        ))}
      </div>

      {/* Azioni chips */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton.Rect key={i} height={48} className="flex-1" />
        ))}
      </div>

      {/* Oggi — 3 cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card space-y-3" style={{ minHeight: 260 }}>
            <div className="flex items-center gap-2">
              <Skeleton.Circle size={16} />
              <Skeleton.Text width="30%" />
              <Skeleton.Rect width={28} height={22} rounded="full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton.Text width="60%" />
                  <Skeleton.Rect width={60} height={20} rounded="full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card space-y-3" style={{ minHeight: 200 }}>
          <Skeleton.Text width="40%" />
          <Skeleton.Rect height={6} className="w-full" rounded="full" />
          <div className="flex items-center gap-3">
            <Skeleton.Rect width={32} height={32} />
            <div className="space-y-1 flex-1">
              <Skeleton.Text width="70%" />
              <Skeleton.TextSm width="40%" />
            </div>
          </div>
        </div>
        <div className="card space-y-3" style={{ minHeight: 200 }}>
          <Skeleton.Text width="45%" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton.Circle size={8} />
              <Skeleton.Text width={`${60 + Math.random() * 30}%`} />
              <Skeleton.TextSm width={40} className="ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
