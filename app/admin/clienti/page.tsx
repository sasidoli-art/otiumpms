import { prisma } from '@/lib/db'
import { formatData, pianoLabel, statoAbbonamentoLabel, statoAbbonamentoColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Search } from 'lucide-react'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ q?: string; piano?: string; stato?: string }>
}

export default async function AdminClientiPage({ searchParams }: Props) {
  const { q, piano, stato } = await searchParams
  const clienti = await prisma.host.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { nomeAzienda: { contains: q, mode: 'insensitive' } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { user: { nome: { contains: q, mode: 'insensitive' } } },
                { user: { cognome: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {},
        piano ? { piano: piano as 'EVENTO_SINGOLO' | 'VISIBILITA_MENSILE' | 'PARTNER_PREMIUM' } : {},
        stato ? { statoAbbonamento: stato as 'ATTIVO' | 'SOSPESO' | 'SCADUTO' | 'IN_PROVA' } : {},
      ],
    },
    include: {
      user: { select: { email: true, nome: true, cognome: true } },
      _count: { select: { eventi: true, fatture: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
          <p className="text-gray-500 text-sm mt-1">{clienti.length} clienti trovati</p>
        </div>
        <Link href="/admin/clienti/nuovo" className="btn-primary flex items-center gap-2">
          <UserPlus size={16} />
          Nuovo cliente
        </Link>
      </div>

      {/* Filtri */}
      <div className="card p-4 mb-6">
        <form method="GET" className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Cerca per nome, azienda, email..."
              className="input pl-9"
            />
          </div>
          <select name="piano" defaultValue={piano ?? ''} className="input w-auto">
            <option value="">Tutti i piani</option>
            <option value="EVENTO_SINGOLO">Evento Singolo</option>
            <option value="VISIBILITA_MENSILE">Visibilità Mensile</option>
            <option value="PARTNER_PREMIUM">Partner Premium</option>
          </select>
          <select name="stato" defaultValue={stato ?? ''} className="input w-auto">
            <option value="">Tutti gli stati</option>
            <option value="ATTIVO">Attivo</option>
            <option value="IN_PROVA">In prova</option>
            <option value="SOSPESO">Sospeso</option>
            <option value="SCADUTO">Scaduto</option>
          </select>
          <button type="submit" className="btn-primary">Filtra</button>
          {(q || piano || stato) && (
            <Link href="/admin/clienti" className="btn-secondary">Reset</Link>
          )}
        </form>
      </div>

      {/* Tabella */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Azienda / Referente</th>
                <th className="table-th">Piano</th>
                <th className="table-th">Stato</th>
                <th className="table-th">Fine abbonamento</th>
                <th className="table-th">Eventi</th>
                <th className="table-th">Fatture</th>
                <th className="table-th">Registrato</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clienti.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                    Nessun cliente trovato
                  </td>
                </tr>
              ) : (
                clienti.map((host) => (
                  <tr key={host.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-xs shrink-0">
                          {host.nomeAzienda.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{host.nomeAzienda}</p>
                          <p className="text-xs text-gray-400">{host.user.nome} {host.user.cognome} · {host.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <Badge className="bg-brand-100 text-brand-700">{pianoLabel(host.piano)}</Badge>
                    </td>
                    <td className="table-td">
                      <Badge className={statoAbbonamentoColor(host.statoAbbonamento)}>
                        {statoAbbonamentoLabel(host.statoAbbonamento)}
                      </Badge>
                    </td>
                    <td className="table-td text-gray-500">
                      {formatData(host.dataFineAbb)}
                    </td>
                    <td className="table-td">
                      <span className="font-medium">{host._count.eventi}</span>
                    </td>
                    <td className="table-td">
                      <span className="font-medium">{host._count.fatture}</span>
                    </td>
                    <td className="table-td text-gray-400 text-xs">
                      {formatData(host.createdAt)}
                    </td>
                    <td className="table-td">
                      <Link
                        href={`/admin/clienti/${host.id}`}
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      >
                        Dettaglio →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
