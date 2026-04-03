import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { CreditCard, TrendingUp, AlertTriangle, Clock } from 'lucide-react'

export const metadata = { title: 'Abbonamenti — SuperAdmin' }

const STATO_BADGE: Record<string, BadgeVariant> = {
  ATTIVO: 'green',
  IN_PROVA: 'blue',
  SOSPESO: 'yellow',
  SCADUTO: 'red',
}

const PIANO_BADGE: Record<string, BadgeVariant> = {
  EVENTO_SINGOLO: 'gray',
  VISIBILITA_MENSILE: 'blue',
  PARTNER_PREMIUM: 'purple',
}

export default async function SuperAdminAbbonamentiPage() {
  const now = new Date()

  const [hosts, attivi, inProva, scaduti] = await Promise.all([
    prisma.host.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nomeAzienda: true,
        piano: true,
        statoAbbonamento: true,
        dataInizioAbb: true,
        dataFineAbb: true,
        createdAt: true,
      },
    }),
    prisma.host.count({ where: { statoAbbonamento: 'ATTIVO' } }),
    prisma.host.count({ where: { statoAbbonamento: 'IN_PROVA' } }),
    prisma.host.count({ where: { statoAbbonamento: 'SCADUTO' } }),
  ])

  // MRR: somma prezzoMensile degli abbonamenti ATTIVO
  const mrr = await prisma.abbonamento.aggregate({
    where: { stato: 'ATTIVO' },
    _sum: { prezzoMensile: true },
  })

  const kpis = [
    { label: 'Attivi', value: attivi, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'In prova', value: inProva, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Scaduti', value: scaduti, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'MRR', value: `€${Math.round(mrr._sum.prezzoMensile || 0).toLocaleString('it-IT')}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Abbonamenti</h1>{/* TODO: i18n */}
        <p className="text-sm text-gray-500">{hosts.length} host sulla piattaforma</p>{/* TODO: i18n */}
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

      {/* Tabella */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Host</th>
                <th className="table-th">Piano</th>{/* TODO: i18n */}
                <th className="table-th">Stato</th>{/* TODO: i18n */}
                <th className="table-th">Inizio</th>{/* TODO: i18n */}
                <th className="table-th">Scadenza</th>{/* TODO: i18n */}
                <th className="table-th text-right">Giorni rimasti</th>{/* TODO: i18n */}
              </tr>
            </thead>
            <tbody>
              {hosts.map(h => {
                const giorniRimasti = h.dataFineAbb ? differenceInDays(h.dataFineAbb, now) : null
                const isExpiring = giorniRimasti !== null && giorniRimasti <= 30 && giorniRimasti > 0
                const isExpired = giorniRimasti !== null && giorniRimasti <= 0

                return (
                  <tr
                    key={h.id}
                    className={`border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 ${
                      isExpired ? 'bg-red-50/50 dark:bg-red-900/10' : isExpiring ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                    }`}
                  >
                    <td className="table-td font-medium text-gray-900 dark:text-slate-100">{h.nomeAzienda}</td>
                    <td className="table-td">
                      <Badge variant={PIANO_BADGE[h.piano] || 'gray'}>{h.piano.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="table-td">
                      <Badge variant={STATO_BADGE[h.statoAbbonamento] || 'gray'}>{h.statoAbbonamento.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="table-td text-gray-500">
                      {h.dataInizioAbb ? format(h.dataInizioAbb, 'd MMM yyyy', { locale: it }) : '—'}
                    </td>
                    <td className="table-td text-gray-500">
                      {h.dataFineAbb ? format(h.dataFineAbb, 'd MMM yyyy', { locale: it }) : '—'}
                    </td>
                    <td className="table-td text-right">
                      {giorniRimasti !== null ? (
                        <span className={`font-semibold ${
                          isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-gray-700 dark:text-slate-300'
                        }`}>
                          {isExpired ? `Scaduto da ${Math.abs(giorniRimasti)}g` : `${giorniRimasti}g`}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {hosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-td text-center text-gray-400 py-8">
                    Nessun host trovato{/* TODO: i18n */}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
