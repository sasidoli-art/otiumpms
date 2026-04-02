import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { formatData, categoriaEventoLabel, statoEventoLabel, statoEventoColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { isHostAuthorized } from '@/lib/permissions'

export default async function HostEventiPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const eventi = await prisma.evento.findMany({
    where: { hostId },
    orderBy: [{ stato: 'asc' }, { dataInizio: 'desc' }],
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">I miei eventi</h1>
          <p className="text-gray-500 text-sm mt-1">{eventi.length} eventi</p>
        </div>
        <Link href="/host/eventi/nuovo" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nuovo evento
        </Link>
      </div>

      {eventi.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">🎭</p>
          <p className="text-lg font-semibold text-gray-700 mb-2">Nessun evento ancora</p>
          <p className="text-gray-400 text-sm mb-6">Inizia inserendo il tuo primo evento per promuoverlo sulla piattaforma</p>
          <Link href="/host/eventi/nuovo" className="btn-primary">Inserisci il tuo primo evento</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Evento</th>
                  <th className="table-th">Categoria</th>
                  <th className="table-th">Data</th>
                  <th className="table-th">Views</th>
                  <th className="table-th">Click</th>
                  <th className="table-th">In evidenza</th>
                  <th className="table-th">Stato</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {eventi.map(ev => (
                  <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div>
                        <p className="font-medium text-gray-900">{ev.titolo}</p>
                        <p className="text-xs text-gray-400">{ev.citta}, {ev.regione}</p>
                      </div>
                    </td>
                    <td className="table-td text-sm text-gray-500">{categoriaEventoLabel(ev.categoria)}</td>
                    <td className="table-td text-gray-500">{formatData(ev.dataInizio)}</td>
                    <td className="table-td font-medium">{ev.visualizzazioni}</td>
                    <td className="table-td font-medium">{ev.click}</td>
                    <td className="table-td">
                      {ev.inEvidenza ? (
                        <span className="text-yellow-500 text-sm font-medium">⭐ Sì</span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="table-td">
                      <Badge className={statoEventoColor(ev.stato)}>{statoEventoLabel(ev.stato)}</Badge>
                    </td>
                    <td className="table-td">
                      <Link href={`/host/eventi/${ev.id}`} className="text-brand-600 text-sm hover:underline">Gestisci</Link>
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
