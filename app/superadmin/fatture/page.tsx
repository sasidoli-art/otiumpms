import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Euro, FileText, CheckCircle2, Clock } from 'lucide-react'

export const metadata = { title: 'Fatture — SuperAdmin' }

const STATO_BADGE: Record<string, BadgeVariant> = {
  BOZZA: 'gray',
  INVIATA: 'blue',
  PAGATA: 'green',
  SCADUTA: 'red',
  ANNULLATA: 'yellow',
}

export default async function SuperAdminFatturePage() {
  const [fatture, totaleEmesse, totalePagato, totaleDaIncassare] = await Promise.all([
    prisma.fattura.findMany({
      orderBy: { dataEmissione: 'desc' },
      include: {
        host: { select: { nomeAzienda: true } },
      },
    }),
    prisma.fattura.aggregate({
      _sum: { totale: true },
      _count: true,
    }),
    prisma.fattura.aggregate({
      where: { stato: 'PAGATA' },
      _sum: { totale: true },
    }),
    prisma.fattura.aggregate({
      where: { stato: { in: ['INVIATA', 'SCADUTA'] } },
      _sum: { totale: true },
    }),
  ])

  const fmtEur = (v: number | null) => `€${Math.round(v || 0).toLocaleString('it-IT')}`

  const kpis = [
    { label: 'Fatture emesse', value: totaleEmesse._count, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Totale emesso', value: fmtEur(totaleEmesse._sum.totale), icon: Euro, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Totale incassato', value: fmtEur(totalePagato._sum.totale), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Da incassare', value: fmtEur(totaleDaIncassare._sum.totale), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ] // TODO: i18n

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Fatturazione</h1>{/* TODO: i18n */}
        <p className="text-sm text-gray-500">Panoramica fatture di tutti gli host</p>{/* TODO: i18n */}
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
                <th className="table-th">Numero</th>{/* TODO: i18n */}
                <th className="table-th">Host</th>
                <th className="table-th">Data emissione</th>{/* TODO: i18n */}
                <th className="table-th text-right">Importo</th>{/* TODO: i18n */}
                <th className="table-th">Stato</th>{/* TODO: i18n */}
              </tr>
            </thead>
            <tbody>
              {fatture.map(f => (
                <tr key={f.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="table-td font-medium text-gray-900 dark:text-slate-100">{f.numero}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{f.host.nomeAzienda}</td>
                  <td className="table-td text-gray-500">
                    {format(f.dataEmissione, 'd MMM yyyy', { locale: it })}
                  </td>
                  <td className="table-td text-right font-semibold text-gray-900 dark:text-slate-100">
                    {fmtEur(f.totale)}
                  </td>
                  <td className="table-td">
                    <Badge variant={STATO_BADGE[f.stato] || 'gray'}>{f.stato}</Badge>
                  </td>
                </tr>
              ))}
              {fatture.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-td text-center text-gray-400 py-8">
                    Nessuna fattura trovata{/* TODO: i18n */}
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
