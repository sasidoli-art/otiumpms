import { Skeleton } from '@/components/ui/skeleton'

export function SpaSkeleton() {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton.Text width="35%" className="h-6" />
          <Skeleton.TextSm width="25%" />
        </div>
        <div className="flex gap-2">
          <Skeleton.Button />
          <Skeleton.Button className="w-24" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-2 py-4">
            <Skeleton.TextSm width="50%" />
            <Skeleton.Rect height={28} width="40%" />
          </div>
        ))}
      </div>

      {/* Treatment cards */}
      <div>
        <Skeleton.Text width="25%" className="h-5 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton.Rect width={40} height={40} />
                <div className="flex-1 space-y-1">
                  <Skeleton.Text width={`${50 + Math.random() * 30}%`} />
                  <Skeleton.TextSm width="40%" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Skeleton.TextSm width={60} />
                <Skeleton.Rect width={50} height={20} rounded="full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
