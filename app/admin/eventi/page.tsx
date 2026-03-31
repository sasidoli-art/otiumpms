import { prisma } from '@/lib/db'
import { formatData, categoriaEventoLabel, statoEventoLabel, statoEventoColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { EventoActions } from './evento-actions'

interface Props {
  searchParams: Promise<{ q?: string; stato?: string; categoria?: string }>
}

export default async function AdminEventiPage({ searchParams }: Props) {
  const { q, stato, categoria } = await searchParams
  const eventi = await prisma.evento.findMany({
    where: {
      AND: [
        q ? { OR: [
          { titolo: { contains: q, mode: 'insensitive' } },
          { citta: { contains: q, mode: 'insensitive' } },
        ] } : {},
        stato ? { stato: stato as 'BOZZA' | 'IN_ATTESA' | 'APPROVATO' | 'RIFIUTATO' | 'SCADUTO' } : {},
        categoria ? { categoria: categoria as 'MUSICA' | 'ARTE' | 'TEATRO' | 'FOOD' | 'SPORT' | 'FESTIVAL' | 'FIERA' | 'CONFERENZA' | 'CINEMA' | 'NATURA' | 'FAMIGLIA' | 'ALTRO' } : {},
      ],
    },
    include: {
      host: { select: { nomeAzienda: true, id: true } },
    },
    orderBy: [{ stato: 'asc' }, { createdAt: 'desc' }],
  })

  const inAttesa = eventi.filter(e => e.stato === 'IN_ATTESA').length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventi</h1>
          <p className="text-gray-500 text-sm mt-1">
            {eventi.length} eventi · {inAttesa > 0 && <span className="text-orange-600 font-medium">{inAttesa} in attesa di approvazione</span>}
          </p>
        </div>
      </div>

      {/* Filtri */}
      <div className="card p-4 mb-6">
        <form method="GET" className="flex flex-wrap gap-3">
          <input name="q" defaultValue={q} placeholder="Cerca per titolo, città..." className="input flex-1 min-w-[200px]" />
          <select name="stato" defaultValue={stato ?? ''} className="input w-auto">
            <option value="">Tutti gli stati</option>
            <option value="IN_ATTESA">In attesa</option>
            <option value="APPROVATO">Approvati</option>
            <option value="BOZZA">Bozze</option>
            <option value="RIFIUTATO">Rifiutati</option>
            <option value="SCADUTO">Scaduti</option>
          </select>
          <select name="categoria" defaultValue={categoria ?? ''} className="input w-auto">
            <option value="">Tutte le categorie</option>
            <option value="MUSICA">Musica</option>
            <option value="ARTE">Arte</option>
            <option value="TEATRO">Teatro</option>
            <option value="FOOD">Food</option>
            <option value="SPORT">Sport</option>
            <option value="FESTIVAL">Festival</option>
            <option value="FIERA">Fiera</option>
            <option value="CONFERENZA">Conferenza</option>
            <option value="CINEMA">Cinema</option>
          </select>
          <button type="submit" className="btn-primary">Filtra</button>
          {(q || stato || categoria) && <Link href="/admin/eventi" className="btn-secondary">Reset</Link>}
        </form>
      </div>

      {/* Tabella */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Evento</th>
                <th className="table-th">Organizzatore</th>
                <th className="table-th">Categoria</th>
                <th className="table-th">Data evento</th>
                <th className="table-th">Views</th>
                <th className="table-th">Stato</th>
                <th className="table-th">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {eventi.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">Nessun evento trovato</td></tr>
              ) : eventi.map(ev => (
                <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td">
                    <div>
                      <p className="font-medium text-gray-900">{ev.titolo}</p>
                      <p className="text-xs text-gray-400">{ev.citta}, {ev.regione}</p>
                    </div>
                  </td>
                  <td className="table-td">
                    <Link href={`/admin/clienti/${ev.host.id}`} className="text-brand-600 hover:underline text-sm">
                      {ev.host.nomeAzienda}
                    </Link>
                  </td>
                  <td className="table-td text-sm text-gray-500">{categoriaEventoLabel(ev.categoria)}</td>
                  <td className="table-td text-gray-500">{formatData(ev.dataInizio)}</td>
                  <td className="table-td">
                    <span className="font-medium">{ev.visualizzazioni}</span>
                    <span className="text-gray-400 text-xs ml-1">/ {ev.click} click</span>
                  </td>
                  <td className="table-td">
                    <Badge className={statoEventoColor(ev.stato)}>
                      {statoEventoLabel(ev.stato)}
                    </Badge>
                  </td>
                  <td className="table-td">
                    <EventoActions eventoId={ev.id} statoAttuale={ev.stato} />
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
