import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { formatData, formatValuta, statoFatturaLabel, statoFatturaColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { FileDown } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function HostFatturePage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const t = await getTranslations('host.invoices')
  const tc = await getTranslations('common')

  const fatture = await prisma.fattura.findMany({
    where: { hostId },
    orderBy: { dataEmissione: 'desc' },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{fatture.length} {t('count')}</p>
      </div>

      {fatture.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">📄</p>
          <p className="text-lg font-semibold text-gray-700">{t('noInvoices')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('invoicesWillAppear')}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">{t('number')}</th>
                  <th className="table-th">{t('issueDate')}</th>
                  <th className="table-th">{t('dueDate')}</th>
                  <th className="table-th">{t('taxBase')}</th>
                  <th className="table-th">{t('vat')}</th>
                  <th className="table-th">{t('total')}</th>
                  <th className="table-th">{t('status')}</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fatture.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono font-semibold">{f.numero}</td>
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
                        <Link href={`/host/fatture/${f.id}`} className="text-brand-600 text-sm hover:underline">
                          {tc('open')}
                        </Link>
                        <a
                          href={`/api/host/fatture/${f.id}/pdf`}
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
      )}
    </div>
  )
}
