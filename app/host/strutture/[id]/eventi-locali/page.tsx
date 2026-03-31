import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, ExternalLink, Package, Plus } from 'lucide-react'
import { formatData, formatValuta } from '@/lib/utils'

export default async function EventiLocaliPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: hostId },
    select: { id: true, nome: true, citta: true, regione: true },
  })
  if (!struttura) notFound()

  // Fetch approved events in the same region (or city)
  // These represent local Otiumweek events near the structure
  const eventiLocali = await prisma.evento.findMany({
    where: {
      stato: 'APPROVATO',
      dataInizio: { gte: new Date() },
      OR: [
        ...(struttura.citta ? [{ citta: struttura.citta }] : []),
        ...(struttura.regione ? [{ regione: struttura.regione }] : []),
      ],
    },
    select: {
      id: true,
      titolo: true,
      descrizione: true,
      categoria: true,
      dataInizio: true,
      dataFine: true,
      orario: true,
      citta: true,
      regione: true,
      luogo: true,
      prezzo: true,
      urlEvento: true,
      immagine: true,
      host: { select: { nomeAzienda: true } },
    },
    orderBy: { dataInizio: 'asc' },
    take: 30,
  })

  // Existing packages for this structure
  const pacchetti = await prisma.pacchetto.findMany({
    where: { strutturaId: struttura.id, hostId: hostId },
    select: {
      id: true,
      nome: true,
      eventoId: true,
      eventoEsterno: true,
      prezzo: true,
      attivo: true,
    },
  })

  const linkedEventIds = new Set(pacchetti.filter(p => p.eventoId).map(p => p.eventoId))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/host/strutture/${struttura.id}`} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Eventi locali</h1>
            <p className="text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5 inline mr-0.5" />
              Eventi vicino a {struttura.nome}
              {struttura.citta ? ` · ${struttura.citta}` : ''}
              {struttura.regione ? `, ${struttura.regione}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <p className="text-sm text-indigo-800 font-medium">
          Crea pacchetti "evento + soggiorno" per aumentare le prenotazioni
        </p>
        <p className="text-xs text-indigo-600 mt-1">
          Collega un evento qui sotto alla tua struttura per offrire un pacchetto combinato ai tuoi ospiti.
          Gli eventi mostrati sono quelli approvati su Otiumweek nella tua zona.
        </p>
      </div>

      {/* Existing packages */}
      {pacchetti.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            Pacchetti attivi per questa struttura
          </h2>
          <div className="divide-y divide-gray-100">
            {pacchetti.map(p => (
              <div key={p.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.nome}</p>
                  <p className="text-xs text-gray-500">{formatValuta(p.prezzo)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {p.attivo ? 'Attivo' : 'Bozza'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events list */}
      {eventiLocali.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nessun evento imminente nella tua zona</p>
          <p className="text-xs text-gray-400 mt-1">
            Gli eventi approvati su Otiumweek nella regione {struttura.regione || 'della struttura'} appariranno qui
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">{eventiLocali.length} eventi trovati nella tua zona</p>
          {eventiLocali.map(ev => {
            const alreadyLinked = linkedEventIds.has(ev.id)
            return (
              <div key={ev.id} className="card hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  <div className="shrink-0 w-14 h-14 bg-indigo-50 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-indigo-700 leading-none">
                      {new Date(ev.dataInizio).getDate()}
                    </span>
                    <span className="text-xs text-indigo-500 uppercase">
                      {new Date(ev.dataInizio).toLocaleDateString('it', { month: 'short' })}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{ev.titolo}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <MapPin className="w-3 h-3 inline mr-0.5" />
                          {ev.citta}, {ev.regione}
                          {ev.luogo && ` · ${ev.luogo}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatData(ev.dataInizio)}
                          {ev.dataFine && ` — ${formatData(ev.dataFine)}`}
                          {ev.orario && ` · ${ev.orario}`}
                          {ev.prezzo && ` · ${ev.prezzo}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ev.urlEvento && (
                          <a
                            href={ev.urlEvento}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            title="Pagina evento"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {alreadyLinked ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-medium">
                            Pacchetto creato
                          </span>
                        ) : (
                          <Link
                            href={`/host/pacchetti/nuovo?strutturaId=${struttura.id}&eventoId=${ev.id}`}
                            className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Crea pacchetto
                          </Link>
                        )}
                      </div>
                    </div>

                    {ev.descrizione && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {ev.descrizione}
                      </p>
                    )}

                    <p className="text-xs text-gray-300 mt-1">
                      {ev.host.nomeAzienda}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
