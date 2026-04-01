import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Package, Calendar, MapPin, Users, Tag } from 'lucide-react'
import { formatValuta, formatData } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'

export default async function PacchettiPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const t = await getTranslations('host.packages')
  const tc = await getTranslations('common')

  const pacchetti = await prisma.pacchetto.findMany({
    where: { hostId: hostId },
    include: {
      struttura: { select: { nome: true, citta: true } },
      evento: { select: { titolo: true, dataInizio: true, citta: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">
            {t('packageDetails')}
          </p>
        </div>
        <Link
          href="/host/pacchetti/nuovo"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuovo pacchetto
        </Link>
      </div>

      {/* List */}
      {pacchetti.length === 0 ? (
        <div className="card text-center py-16">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nessun pacchetto creato</p>
          <p className="text-xs text-gray-400 mt-1">
            Crea un pacchetto per collegare un evento alla tua struttura e offrire un soggiorno combinato
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pacchetti.map(p => (
            <Link
              key={p.id}
              href={`/host/pacchetti/${p.id}`}
              className="card hover:shadow-md transition-shadow group"
            >
              {/* Badge attivo/disattivo */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {p.nome}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {p.attivo ? tc('active') : tc('draft')}
                </span>
              </div>

              {/* Struttura */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <MapPin className="w-3 h-3" />
                {p.struttura.nome}
                {p.struttura.citta && ` · ${p.struttura.citta}`}
              </div>

              {/* Evento collegato */}
              {(p.evento || p.eventoEsterno) && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 mb-2">
                  <Calendar className="w-3 h-3" />
                  {p.evento
                    ? `${p.evento.titolo}${p.evento.dataInizio ? ` · ${formatData(p.evento.dataInizio)}` : ''}`
                    : p.eventoEsterno
                  }
                </div>
              )}

              {/* Details row */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />{p.numOspiti} ospiti
                </span>
                <span>{p.notti} {p.notti === 1 ? 'notte' : 'notti'}</span>
                {p.incluso.length > 0 && (
                  <span>{p.incluso.length} servizi inclusi</span>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-lg font-bold text-indigo-600">{formatValuta(p.prezzo)}</span>
                {p.prezzoOriginale && p.prezzoOriginale > p.prezzo && (
                  <span className="text-sm text-gray-400 line-through">{formatValuta(p.prezzoOriginale)}</span>
                )}
              </div>

              {/* Validity */}
              {(p.dataInizio || p.dataFine) && (
                <p className="text-xs text-gray-400 mt-1">
                  <Tag className="w-3 h-3 inline mr-0.5" />
                  {p.dataInizio ? `Dal ${formatData(p.dataInizio)}` : ''}
                  {p.dataFine ? ` al ${formatData(p.dataFine)}` : ''}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
