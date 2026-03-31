import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth } from 'date-fns'
import Link from 'next/link'
import { Building2, Users, CreditCard, CalendarCheck, Euro, TrendingUp, AlertTriangle, Globe } from 'lucide-react'

export const metadata = { title: 'SuperAdmin — Otium Week' }

export default async function SuperAdminDashboard() {
  const now = new Date()
  const inizioMese = startOfMonth(now)
  const fineMese = endOfMonth(now)

  const [
    totaleHost, totaleStrutture, totaleUtenti, totalePrenotazioniMese,
    hostAttivi, hostInProva, hostScaduti,
    prenotazioniConfermate, revenueMese,
  ] = await Promise.all([
    prisma.host.count(),
    prisma.struttura.count(),
    prisma.user.count(),
    prisma.prenotazione.count({
      where: { createdAt: { gte: inizioMese, lte: fineMese } },
    }),
    prisma.host.count({ where: { statoAbbonamento: 'ATTIVO' } }),
    prisma.host.count({ where: { statoAbbonamento: 'IN_PROVA' } }),
    prisma.host.count({ where: { statoAbbonamento: 'SCADUTO' } }),
    prisma.prenotazione.count({
      where: { stato: 'CONFERMATA', createdAt: { gte: inizioMese } },
    }),
    prisma.prenotazione.aggregate({
      where: { stato: { in: ['CONFERMATA', 'COMPLETATA'] }, createdAt: { gte: inizioMese } },
      _sum: { prezzoTotale: true },
    }),
  ])

  // Ultimi host registrati
  const ultimiHost = await prisma.host.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, nomeAzienda: true, citta: true, piano: true, statoAbbonamento: true, createdAt: true,
      _count: { select: { strutture: true, prenotazioni: true } },
    },
  })

  const kpis = [
    { label: 'Host totali', value: totaleHost, icon: Building2, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Strutture', value: totaleStrutture, icon: Globe, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Utenti', value: totaleUtenti, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Prenotazioni mese', value: totalePrenotazioniMese, icon: CalendarCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Revenue mese', value: `€${Math.round(revenueMese._sum.prezzoTotale || 0).toLocaleString('it-IT')}`, icon: Euro, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Abbonamenti attivi', value: hostAttivi, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'In prova', value: hostInProva, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Scaduti', value: hostScaduti, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  const STATO_COLORI: Record<string, string> = {
    ATTIVO: 'bg-green-100 text-green-700',
    IN_PROVA: 'bg-blue-100 text-blue-700',
    SOSPESO: 'bg-amber-100 text-amber-700',
    SCADUTO: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Dashboard Piattaforma</h1>
        <p className="text-sm text-gray-500">Panoramica globale di tutti gli host e strutture</p>
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

      {/* Ultimi host */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Ultimi host registrati</h2>
          <Link href="/superadmin/host" className="text-xs text-brand-600 hover:underline">Vedi tutti</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Azienda</th>
                <th className="table-th">Città</th>
                <th className="table-th">Piano</th>
                <th className="table-th">Stato</th>
                <th className="table-th text-right">Strutture</th>
                <th className="table-th text-right">Prenotazioni</th>
              </tr>
            </thead>
            <tbody>
              {ultimiHost.map(h => (
                <tr key={h.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="table-td font-medium">{h.nomeAzienda}</td>
                  <td className="table-td text-gray-500">{h.citta || '—'}</td>
                  <td className="table-td"><span className="text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded">{h.piano}</span></td>
                  <td className="table-td"><span className={`text-xs px-2 py-0.5 rounded ${STATO_COLORI[h.statoAbbonamento] || ''}`}>{h.statoAbbonamento}</span></td>
                  <td className="table-td text-right">{h._count.strutture}</td>
                  <td className="table-td text-right font-medium">{h._count.prenotazioni}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
