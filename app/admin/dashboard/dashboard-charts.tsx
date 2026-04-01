'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatValuta } from '@/lib/utils'
import { useTranslations } from 'next-intl'

/* ── Revenue per month (area chart) ───────────────────────── */

type RevenueMese = { mese: string; fatturato: number; prenotazioni: number }

export function RevenueChart({ data }: { data: RevenueMese[] }) {
  const t = useTranslations('admin.dashboard')
  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Fatturato mensile</h2>{/* TODO: i18n */}
        <p className="text-xs text-gray-400 mt-0.5">Ultimi 6 mesi — fatture pagate</p>{/* TODO: i18n */}
      </div>
      <div className="px-4 py-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradFatturato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
            <XAxis dataKey="mese" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={v => `€${v}`} />
            <Tooltip
              formatter={(value: number) => [formatValuta(value), 'Fatturato']}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Area
              type="monotone"
              dataKey="fatturato"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#gradFatturato)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Prenotazioni per month (bar chart) ───────────────────── */

export function PrenotazioniChart({ data }: { data: RevenueMese[] }) {
  const t = useTranslations('admin.bookings')
  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Prenotazioni mensili</h2>{/* TODO: i18n */}
        <p className="text-xs text-gray-400 mt-0.5">Ultimi 6 mesi — tutte le prenotazioni</p>{/* TODO: i18n */}
      </div>
      <div className="px-4 py-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
            <XAxis dataKey="mese" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              formatter={(value: number) => [value, t('title')]}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="prenotazioni" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Stato prenotazioni (pie chart) ───────────────────────── */

type StatoSlice = { nome: string; valore: number }

const STATO_COLORS: Record<string, string> = {
  Confermate: '#0acf97',
  Richieste: '#ffbc00',
  Completate: '#6366f1',
  Annullate: '#fa5c7c',
  'No Show': '#9ca3af',
}

export function StatoPrenotazioniChart({ data }: { data: StatoSlice[] }) {
  const t = useTranslations('admin.bookings')
  const totale = data.reduce((s, d) => s + d.valore, 0)
  if (totale === 0) {
    return (
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Stato prenotazioni</h2>{/* TODO: i18n */}
        </div>
        <p className="px-6 py-12 text-center text-sm text-gray-400">Nessuna prenotazione</p>{/* TODO: i18n */}
      </div>
    )
  }
  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Stato prenotazioni</h2>{/* TODO: i18n */}
        <p className="text-xs text-gray-400 mt-0.5">Distribuzione corrente</p>{/* TODO: i18n */}
      </div>
      <div className="px-4 py-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="valore"
              nameKey="nome"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              label={({ nome, percent }) => `${nome} ${(percent * 100).toFixed(0)}%`}
              style={{ fontSize: 12 }}
            >
              {data.map((entry) => (
                <Cell key={entry.nome} fill={STATO_COLORS[entry.nome] ?? '#6366f1'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [value, t('title')]}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Top host (horizontal bar chart) ──────────────────────── */

type TopHost = { nome: string; prenotazioni: number; fatturato: number }

export function TopHostChart({ data }: { data: TopHost[] }) {
  const t = useTranslations('admin.bookings')
  if (data.length === 0) {
    return (
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Host più attivi</h2>{/* TODO: i18n */}
        </div>
        <p className="px-6 py-12 text-center text-sm text-gray-400">Nessun host</p>{/* TODO: i18n */}
      </div>
    )
  }
  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Host più attivi</h2>{/* TODO: i18n */}
        <p className="text-xs text-gray-400 mt-0.5">Per numero di prenotazioni</p>{/* TODO: i18n */}
      </div>
      <div className="px-4 py-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis dataKey="nome" type="category" tick={{ fontSize: 11 }} stroke="#9ca3af" width={120} />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'fatturato' ? formatValuta(value) : value,
                name === 'fatturato' ? 'Fatturato' : t('title'),
              ]}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="prenotazioni" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
