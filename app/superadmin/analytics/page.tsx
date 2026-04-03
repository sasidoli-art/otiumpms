import { prisma } from '@/lib/db'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Building2, Users, CalendarCheck, Euro, TrendingUp } from 'lucide-react'
import { AnalyticsPlatformCharts } from './analytics-charts'

export const metadata = { title: 'Analytics — SuperAdmin' }

export default async function SuperAdminAnalyticsPage() {
  const now = new Date()

  // KPI globali
  const [totaleHost, totaleStrutture, totalePrenotazioni, revenueAll] = await Promise.all([
    prisma.host.count(),
    prisma.struttura.count(),
    prisma.prenotazione.count(),
    prisma.prenotazione.aggregate({
      where: { stato: { in: ['CONFERMATA', 'COMPLETATA'] } },
      _sum: { prezzoTotale: true },
    }),
  ])

  // Nuovi host per mese (ultimi 12 mesi)
  const hostPerMese: { mese: string; count: number }[] = []
  const prenotazioniPerMese: { mese: string; count: number }[] = []

  for (let i = 11; i >= 0; i--) {
    const mese = subMonths(now, i)
    const inizio = startOfMonth(mese)
    const fine = endOfMonth(mese)
    const label = format(mese, 'MMM yy', { locale: it })

    const [hCount, pCount] = await Promise.all([
      prisma.host.count({ where: { createdAt: { gte: inizio, lte: fine } } }),
      prisma.prenotazione.count({ where: { createdAt: { gte: inizio, lte: fine } } }),
    ])

    hostPerMese.push({ mese: label, count: hCount })
    prenotazioniPerMese.push({ mese: label, count: pCount })
  }

  // Top 5 host per revenue
  const topHostRevenue = await prisma.host.findMany({
    select: {
      nomeAzienda: true,
      prenotazioni: {
        where: { stato: { in: ['CONFERMATA', 'COMPLETATA'] } },
        select: { prezzoTotale: true },
      },
    },
  })

  const topRevenue = topHostRevenue
    .map(h => ({
      nome: h.nomeAzienda,
      revenue: h.prenotazioni.reduce((sum, p) => sum + (p.prezzoTotale || 0), 0),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Top 5 host per prenotazioni
  const topHostBookings = await prisma.host.findMany({
    select: {
      nomeAzienda: true,
      _count: { select: { prenotazioni: true } },
    },
    orderBy: { prenotazioni: { _count: 'desc' } },
    take: 5,
  })

  const topBookings = topHostBookings.map(h => ({
    nome: h.nomeAzienda,
    prenotazioni: h._count.prenotazioni,
  }))

  const fmtEur = (v: number | null) => `€${Math.round(v || 0).toLocaleString('it-IT')}`

  const kpis = [
    { label: 'Host totali', value: totaleHost, icon: Building2, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Strutture', value: totaleStrutture, icon: Building2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Prenotazioni (all-time)', value: totalePrenotazioni, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Revenue totale', value: fmtEur(revenueAll._sum.prezzoTotale), icon: Euro, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Analytics piattaforma</h1>{/* TODO: i18n */}
        <p className="text-sm text-gray-500">Metriche globali e crescita</p>{/* TODO: i18n */}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${k.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900 dark:text-slate-100">{k.value}</p>
                <p className="text-xs text-gray-500">{k.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <AnalyticsPlatformCharts
        hostPerMese={hostPerMese}
        prenotazioniPerMese={prenotazioniPerMese}
        topRevenue={topRevenue}
        topBookings={topBookings}
      />
    </div>
  )
}
