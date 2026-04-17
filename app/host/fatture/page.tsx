import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { formatData, formatValuta } from '@/lib/utils'
import { Badge, STATO_FATTURA } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import { FileDown } from 'lucide-react'
import { isHostAuthorized } from '@/lib/permissions'

export default async function HostFatturePage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const fatture = await prisma.fattura.findMany({
    where: { hostId },
    orderBy: { dataEmissione: 'desc' },
  })

  return (
    <div className="stack-lg">
      <PageHeader
        title="Le mie fatture"
        description={`${fatture.length} fatture`}
      />

      {fatture.length === 0 ? (
        <Card>
          <EmptyState
            icon="FileText"
            titolo="Nessuna fattura ancora"
            descrizione="Le fatture emesse appariranno qui automaticamente."
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="table-th">Numero</th>
                  <th className="table-th hidden md:table-cell">Data emissione</th>
                  <th className="table-th hidden lg:table-cell">Scadenza</th>
                  <th className="table-th hidden md:table-cell">Imponibile</th>
                  <th className="table-th hidden lg:table-cell">IVA</th>
                  <th className="table-th">Totale</th>
                  <th className="table-th">Stato</th>
                  <th className="table-th" />
                </tr>
              </thead>
              <tbody>
                {fatture.map(f => {
                  const cfg = STATO_FATTURA[f.stato] || { color: 'gray' as const, label: f.stato }
                  return (
                    <tr key={f.id} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="table-td font-mono font-semibold">{f.numero}</td>
                      <td className="table-td text-[var(--text-secondary)] hidden md:table-cell">{formatData(f.dataEmissione)}</td>
                      <td className="table-td text-[var(--text-secondary)] hidden lg:table-cell">{formatData(f.dataScadenza)}</td>
                      <td className="table-td hidden md:table-cell">{formatValuta(f.imponibile)}</td>
                      <td className="table-td text-[var(--text-secondary)] hidden lg:table-cell">{formatValuta(f.iva)}</td>
                      <td className="table-td font-bold">{formatValuta(f.totale)}</td>
                      <td className="table-td">
                        <Badge variant="status" color={cfg.color}>{cfg.label}</Badge>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <Link href={`/host/fatture/${f.id}`} className="text-brand-600 text-sm hover:underline">Apri</Link>
                          <a href={`/api/host/fatture/${f.id}/pdf`} target="_blank" className="btn-icon" title="Scarica PDF">
                            <FileDown size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
