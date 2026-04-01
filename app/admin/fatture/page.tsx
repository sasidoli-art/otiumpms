import { prisma } from '@/lib/db'
import { formatData, formatValuta, statoFatturaLabel, statoFatturaColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, FileDown } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

interface Props {
  searchParams: Promise<{ hostId?: string; stato?: string; anno?: string }>
}

export default async function AdminFatturePage({ searchParams }: Props) {
  const t = await getTranslations('admin.invoices')
  const tc = await getTranslations('common')
  const { hostId, stato, anno } = await searchParams
  const annoInt = anno ? parseInt(anno) : undefined

  const fatture = await prisma.fattura.findMany({
    where: {
      AND: [
        hostId ? { hostId } : {},
        stato ? { stato: stato as 'BOZZA' | 'INVIATA' | 'PAGATA' | 'SCADUTA' | 'ANNULLATA' } : {},
        annoInt ? { anno: annoInt } : {},
      ],
    },
    include: {
      host: { select: { nomeAzienda: true, id: true } },
    },
    orderBy: [{ dataEmissione: 'desc' }],
  })

  const totalePagato = fatture
    .filter(f => f.stato === 'PAGATA')
    .reduce((s, f) => s + f.totale, 0)

  const anniDisponibili = await prisma.fattura.groupBy({
    by: ['anno'],
    orderBy: { anno: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {fatture.length} {t('count')} · {formatValuta(totalePagato)} {t('collected')}
          </p>
        </div>
        <Link href="/admin/fatture/nuovo" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          {t('newInvoice')}
        </Link>
      </div>

      {/* Filtri */}
      <div className="card p-4 mb-6">
        <form method="GET" className="flex flex-wrap gap-3">
          <select name="anno" defaultValue={anno ?? ''} className="input w-auto">
            <option value="">{t('allYears')}</option>
            {anniDisponibili.map(a => (
              <option key={a.anno} value={a.anno}>{a.anno}</option>
            ))}
          </select>
          <select name="stato" defaultValue={stato ?? ''} className="input w-auto">
            <option value="">{t('allStatuses')}</option>
            <option value="BOZZA">{t('draftStatus')}</option>
            <option value="INVIATA">{t('sent')}</option>
            <option value="PAGATA">{t('paid')}</option>
            <option value="SCADUTA">{t('overdue')}</option>
            <option value="ANNULLATA">{t('cancelledStatus')}</option>
          </select>
          <button type="submit" className="btn-primary">{tc('filter')}</button>
          {(stato || hostId || anno) && <Link href="/admin/fatture" className="btn-secondary">{tc('reset')}</Link>}
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">{t('number')}</th>
                <th className="table-th">Cliente</th>{/* TODO: i18n */}
                <th className="table-th">Emissione</th>{/* TODO: i18n */}
                <th className="table-th">Scadenza</th>{/* TODO: i18n */}
                <th className="table-th">Imponibile</th>{/* TODO: i18n */}
                <th className="table-th">IVA</th>
                <th className="table-th">{tc('total')}</th>
                <th className="table-th">{tc('status')}</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fatture.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-400">{tc('noResults')}</td></tr>
              ) : fatture.map(f => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-mono text-sm font-semibold">{f.numero}</td>
                  <td className="table-td">
                    <Link href={`/admin/clienti/${f.host.id}`} className="text-brand-600 hover:underline">
                      {f.host.nomeAzienda}
                    </Link>
                    <p className="text-xs text-gray-400">{f.clienteNome}</p>
                  </td>
                  <td className="table-td text-gray-500">{formatData(f.dataEmissione)}</td>
                  <td className="table-td text-gray-500">{formatData(f.dataScadenza)}</td>
                  <td className="table-td">{formatValuta(f.imponibile)}</td>
                  <td className="table-td text-gray-500">{formatValuta(f.iva)}</td>
                  <td className="table-td font-bold">{formatValuta(f.totale)}</td>
                  <td className="table-td">
                    <Badge className={statoFatturaColor(f.stato)}>{statoFatturaLabel(f.stato)}</Badge>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/fatture/${f.id}`} className="text-brand-600 text-sm hover:underline">
                        {tc('open')}
                      </Link>
                      <a
                        href={`/api/admin/fatture/${f.id}/pdf`}
                        target="_blank"
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title={tc('downloadPdf')}
                      >
                        <FileDown size={14} />
                      </a>
                    </div>
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
