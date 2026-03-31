import { prisma } from '@/lib/db'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Building2, ExternalLink } from 'lucide-react'

export const metadata = { title: 'Host & Clienti — SuperAdmin' }

export default async function SuperAdminHostPage() {
  const hosts = await prisma.host.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, nome: true, cognome: true, attivo: true } },
      _count: { select: { strutture: true, prenotazioni: true, eventi: true, fatture: true } },
    },
  })

  const STATO_COLORI: Record<string, string> = {
    ATTIVO: 'bg-green-100 text-green-700',
    IN_PROVA: 'bg-blue-100 text-blue-700',
    SOSPESO: 'bg-amber-100 text-amber-700',
    SCADUTO: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Host & Clienti</h1>
          <p className="text-sm text-gray-500">{hosts.length} host registrati</p>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Azienda</th>
                <th className="table-th">Referente</th>
                <th className="table-th">Email</th>
                <th className="table-th">Piano</th>
                <th className="table-th">Stato</th>
                <th className="table-th">Scadenza</th>
                <th className="table-th text-right">Strutture</th>
                <th className="table-th text-right">Pren.</th>
                <th className="table-th text-right">Fatture</th>
                <th className="table-th">Registrato</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {hosts.map(h => (
                <tr key={h.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{h.nomeAzienda}</td>
                  <td className="table-td">{h.user.nome} {h.user.cognome}</td>
                  <td className="table-td text-gray-500 text-xs">{h.user.email}</td>
                  <td className="table-td"><span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{h.piano}</span></td>
                  <td className="table-td"><span className={`text-xs px-2 py-0.5 rounded ${STATO_COLORI[h.statoAbbonamento]}`}>{h.statoAbbonamento}</span></td>
                  <td className="table-td text-xs text-gray-500">{h.dataFineAbb ? format(new Date(h.dataFineAbb), 'd MMM yyyy', { locale: it }) : '—'}</td>
                  <td className="table-td text-right">{h._count.strutture}</td>
                  <td className="table-td text-right font-medium">{h._count.prenotazioni}</td>
                  <td className="table-td text-right">{h._count.fatture}</td>
                  <td className="table-td text-xs text-gray-400">{format(new Date(h.createdAt), 'd MMM yyyy', { locale: it })}</td>
                  <td className="table-td">
                    <Link href={`/admin/clienti/${h.id}`} className="text-brand-600 hover:underline text-xs flex items-center gap-1">
                      Gestisci <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
