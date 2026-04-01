'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from 'recharts'

interface Props {
  hostPerMese: { mese: string; count: number }[]
  prenotazioniPerMese: { mese: string; count: number }[]
  topRevenue: { nome: string; revenue: number }[]
  topBookings: { nome: string; prenotazioni: number }[]
}

export function AnalyticsPlatformCharts({ hostPerMese, prenotazioniPerMese, topRevenue, topBookings }: Props) {
  return (
    <div className="space-y-6">
      {/* Grafici a linea: nuovi host + prenotazioni per mese */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4">Nuovi host per mese</h3>{/* TODO: i18n */}
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hostPerMese} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorHost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mese" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#colorHost)" strokeWidth={2} name="Nuovi host" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4">Prenotazioni per mese</h3>{/* TODO: i18n */}
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={prenotazioniPerMese} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPren" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mese" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#22c55e" fill="url(#colorPren)" strokeWidth={2} name="Prenotazioni" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4">Top 5 host per revenue</h3>{/* TODO: i18n */}
          {topRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topRevenue} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(value: number) => [`€${value.toLocaleString('it-IT')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Nessun dato disponibile</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4">Top 5 host per prenotazioni</h3>{/* TODO: i18n */}
          {topBookings.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topBookings} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="prenotazioni" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Prenotazioni" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Nessun dato disponibile</p>
          )}
        </div>
      </div>
    </div>
  )
}
