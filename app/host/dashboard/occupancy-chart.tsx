'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useTranslations } from 'next-intl'

type DataPoint = { data: string; label: string; occupazione: number }

export default function OccupancyChart({ dati }: { dati: DataPoint[] }) {
  const t = useTranslations('host.dashboard')
  if (dati.length === 0) return null

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{t('occupancy30days')}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{t('occupancyDesc')}</p>
      </div>
      <div className="px-4 py-4" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dati} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradOcc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
              formatter={(value: number) => [`${value}%`, t('occupancy')]}
              labelFormatter={(label: string) => label}
            />
            <Area
              type="monotone"
              dataKey="occupazione"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#gradOcc)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
