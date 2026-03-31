import { prisma } from '@/lib/db'
import { formatData, formatValuta, statoPagamentoLabel, statoPagamentoColor, pianoLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PagamentoActions } from './pagamento-actions'

interface Props {
  searchParams: Promise<{ hostId?: string; stato?: string }>
}

export default async function AdminPagamentiPage({ searchParams }: Props) {
  const { hostId, stato } = await searchParams
  const pagamenti = await prisma.pagamento.findMany({
    where: {
      AND: [
        hostId ? { hostId } : {},
        stato ? { stato: stato as 'IN_ATTESA' | 'PAGATO' | 'IN_RITARDO' | 'ANNULLATO' } : {},
      ],
    },
    include: {
      host: { select: { nomeAzienda: true, id: true, piano: true } },
      fattura: { select: { id: true, numero: true } },
    },
    orderBy: [{ stato: 'asc' }, { dataScadenza: 'asc' }],
  })

  const totaleInAttesa = pagamenti
    .filter(p => p.stato === 'IN_ATTESA' || p.stato === 'IN_RITARDO')
    .reduce((sum, p) => sum + p.importo, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagamenti</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totaleInAttesa > 0 && (
              <span className="text-orange-600 font-medium">{formatValuta(totaleInAttesa)} in attesa di incasso</span>
            )}
          </p>
        </div>
        <Link href="/admin/pagamenti/nuovo" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nuovo pagamento
        </Link>
      </div>

      {/* Filtri */}
      <div className="card p-4 mb-6">
        <form method="GET" className="flex flex-wrap gap-3">
          <select name="stato" defaultValue={stato ?? ''} className="input w-auto">
            <option value="">Tutti gli stati</option>
            <option value="IN_ATTESA">In attesa</option>
            <option value="PAGATO">Pagati</option>
            <option value="IN_RITARDO">In ritardo</option>
            <option value="ANNULLATO">Annullati</option>
          </select>
          <button type="submit" className="btn-primary">Filtra</button>
          {(stato || hostId) && <Link href="/admin/pagamenti" className="btn-secondary">Reset</Link>}
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Cliente</th>
                <th className="table-th">Descrizione</th>
                <th className="table-th">Importo</th>
                <th className="table-th">Metodo</th>
                <th className="table-th">Scadenza</th>
                <th className="table-th">Pagato il</th>
                <th className="table-th">Fattura</th>
                <th className="table-th">Stato</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagamenti.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-400">Nessun pagamento trovato</td></tr>
              ) : pagamenti.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td">
                    <Link href={`/admin/clienti/${p.host.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {p.host.nomeAzienda}
                    </Link>
                    <p className="text-xs text-gray-400">{pianoLabel(p.host.piano)}</p>
                  </td>
                  <td className="table-td text-gray-600">{p.descrizione || '—'}</td>
                  <td className="table-td font-semibold">{formatValuta(p.importo)}</td>
                  <td className="table-td text-gray-500">{p.metodo || '—'}</td>
                  <td className="table-td text-gray-500">{formatData(p.dataScadenza)}</td>
                  <td className="table-td text-gray-500">{formatData(p.dataPagamento)}</td>
                  <td className="table-td">
                    {p.fattura ? (
                      <Link href={`/admin/fatture/${p.fattura.id}`} className="text-brand-600 text-sm hover:underline font-mono">
                        {p.fattura.numero}
                      </Link>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="table-td">
                    <Badge className={statoPagamentoColor(p.stato)}>{statoPagamentoLabel(p.stato)}</Badge>
                  </td>
                  <td className="table-td">
                    <PagamentoActions pagamentoId={p.id} statoAttuale={p.stato} />
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
