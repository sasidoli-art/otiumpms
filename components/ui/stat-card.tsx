import { cn } from '@/lib/utils'

interface StatCardProps {
  titolo: string
  valore: string | number
  sotto?: string
  icona: React.ReactNode
  colorIcona?: string
  trend?: { valore: number; etichetta: string }
}

export function StatCard({ titolo, valore, sotto, icona, colorIcona = 'text-brand-500', trend }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h5 className="text-[#6c757d] font-medium text-xs mt-0 uppercase tracking-wide truncate" title={titolo}>{titolo}</h5>
          <h3 className="text-gray-800 font-extrabold text-3xl mt-2 mb-2">{valore}</h3>
          {sotto && (
            <p className="mb-0 text-[#6c757d] text-xs">{sotto}</p>
          )}
          {trend !== undefined && (
            <p className={cn('text-xs font-semibold mt-1', trend.valore >= 0 ? 'text-[#0acf97]' : 'text-[#fa5c7c]')}>
              {trend.valore >= 0 ? '↑' : '↓'} {Math.abs(trend.valore)}% {trend.etichetta}
            </p>
          )}
        </div>
        <div className={cn('ml-3 shrink-0 opacity-80', colorIcona)}>
          {icona}
        </div>
      </div>
    </div>
  )
}
