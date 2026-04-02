import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { CalendarDays, Eye, MousePointerClick, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { formatData, categoriaEventoLabel, statoEventoColor, statoEventoLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AnalyticsChart } from './analytics-chart'
import Link from 'next/link'
import { isHostAuthorized } from '@/lib/permissions'

export default async function HostAnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const [eventi, analyticsUltimi30gg] = await Promise.all([
    prisma.evento.findMany({
      where: { hostId },
      orderBy: { visualizzazioni: 'desc' },
      take: 10,
    }),
    prisma.analyticsGiornalieri.findMany({
      where: {
        evento: { hostId },
        data: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { data: 'asc' },
    }),
  ])

  const totaleViews = eventi.reduce((s, e) => s + e.visualizzazioni, 0)
  const totaleClick = eventi.reduce((s, e) => s + e.click, 0)
  const ctr = totaleViews > 0 ? ((totaleClick / totaleViews) * 100).toFixed(1) : '0'

  // Raggruppa analytics per data
  const chartData = analyticsUltimi30gg.reduce((acc, a) => {
    const dataStr = formatData(a.data)
    const existing = acc.find(d => d.data === dataStr)
    if (existing) {
      existing.views += a.visualizzazioni
      existing.click += a.click
    } else {
      acc.push({ data: dataStr, views: a.visualizzazioni, click: a.click })
    }
    return acc
  }, [] as { data: string; views: number; click: number }[])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Statistiche di performance dei tuoi eventi</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <StatCard titolo="Events attivi" valore={eventi.filter(e => e.stato === 'APPROVATO').length} icona={<CalendarDays size={20} />} colorIcona="bg-brand-100 text-brand-700" />
        <StatCard titolo="Visualizzazioni totali" valore={totaleViews.toLocaleString('it-IT')} icona={<Eye size={20} />} colorIcona="bg-blue-100 text-blue-700" />
        <StatCard titolo="Click totali" valore={totaleClick.toLocaleString('it-IT')} icona={<MousePointerClick size={20} />} colorIcona="bg-green-100 text-green-700" />
        <StatCard titolo="CTR medio" valore={`${ctr}%`} sotto="Click-through rate" icona={<TrendingUp size={20} />} colorIcona="bg-purple-100 text-purple-700" />
      </div>

      {/* Grafico ultimi 30 giorni */}
      {chartData.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Ultimi 30 giorni</h2>
          <AnalyticsChart data={chartData} />
        </div>
      )}

      {/* Tabella eventi per performance */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Performance per evento</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Evento</th>
                <th className="table-th">Categoria</th>
                <th className="table-th">Data</th>
                <th className="table-th">Views</th>
                <th className="table-th">Click</th>
                <th className="table-th">CTR</th>
                <th className="table-th">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {eventi.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-400">
                  Nessun evento — <Link href="/host/eventi/nuovo" className="text-brand-600 hover:underline">inserisci il primo</Link>
                </td></tr>
              ) : eventi.map(ev => {
                const evCtr = ev.visualizzazioni > 0 ? ((ev.click / ev.visualizzazioni) * 100).toFixed(1) : '0'
                return (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <Link href={`/host/eventi/${ev.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                        {ev.titolo}
                      </Link>
                      <p className="text-xs text-gray-400">{ev.citta}</p>
                    </td>
                    <td className="table-td text-sm text-gray-500">{categoriaEventoLabel(ev.categoria)}</td>
                    <td className="table-td text-gray-500">{formatData(ev.dataInizio)}</td>
                    <td className="table-td font-semibold">{ev.visualizzazioni.toLocaleString('it-IT')}</td>
                    <td className="table-td font-semibold">{ev.click.toLocaleString('it-IT')}</td>
                    <td className="table-td text-gray-500">{evCtr}%</td>
                    <td className="table-td"><Badge className={statoEventoColor(ev.stato)}>{statoEventoLabel(ev.stato)}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
