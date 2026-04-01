import { prisma } from '@/lib/db'
import Link from 'next/link'
import { MapPin, Users, Tag, Search, Sparkles } from 'lucide-react'
import { TipoStruttura } from '@prisma/client'
import { getTranslations } from 'next-intl/server'

function isTipoStruttura(s: string): s is TipoStruttura {
  return Object.values(TipoStruttura).includes(s as TipoStruttura)
}

const TIPO_EMOJI: Record<string, string> = {
  EVENTO: '🎭', VENUE: '🏛️', ESPERIENZA: '✨', ALLOGGIO: '🏠', SERVIZIO: '🎯',
}

const TIPO_BG: Record<string, string> = {
  EVENTO: 'from-purple-400 to-indigo-500',
  VENUE: 'from-blue-400 to-cyan-500',
  ESPERIENZA: 'from-amber-400 to-orange-500',
  ALLOGGIO: 'from-green-400 to-teal-500',
  SERVIZIO: 'from-gray-400 to-slate-500',
}

export default async function EsploraPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; regione?: string; q?: string }>
}) {
  const { tipo, regione, q } = await searchParams
  const t = await getTranslations('booking')
  const tc = await getTranslations('common')
  const ts = await getTranslations('structureTypes')

  const strutture = await prisma.struttura.findMany({
    where: {
      attiva: true,
      ...(tipo && isTipoStruttura(tipo) ? { tipo } : {}),
      ...(regione ? { regione: { contains: regione, mode: 'insensitive' } } : {}),
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: 'insensitive' } },
              { descrizione: { contains: q, mode: 'insensitive' } },
              { citta: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      host: { select: { nomeAzienda: true } },
      _count: { select: { unita: true, prenotazioni: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const tuttiTipi = ['EVENTO', 'VENUE', 'ESPERIENZA', 'ALLOGGIO', 'SERVIZIO']

  const TIPO_LABEL: Record<string, string> = {
    EVENTO: ts('event'), VENUE: ts('venue'), ESPERIENZA: ts('experience'), ALLOGGIO: ts('accommodation'), SERVIZIO: ts('service'),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" />
            <a href="https://otiumweek.it" className="text-white/80 hover:text-white text-sm font-medium">Otium Week</a>
          </div>
          <h1 className="text-3xl font-bold mb-2">{t('discover')}</h1>
          <p className="text-indigo-100 text-sm mb-8">{t('discoverSubtitle')}</p>

          {/* Search */}
          <form className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-white text-indigo-700 font-medium text-sm rounded-xl hover:bg-indigo-50 transition-colors"
            >
              {tc('search')}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Filtri tipo */}
        <div className="flex gap-2 flex-wrap mb-6">
          <Link
            href="/book"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!tipo ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            {t('all')}
          </Link>
          {tuttiTipi.map((tp) => (
            <Link
              key={tp}
              href={`/book?tipo=${tp}${regione ? `&regione=${regione}` : ''}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${tipo === tp ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
            >
              {TIPO_EMOJI[tp]} {TIPO_LABEL[tp]}
            </Link>
          ))}
        </div>

        {/* Risultati */}
        {strutture.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔍</p>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">{t('noResults')}</h2>
            <p className="text-gray-400 text-sm">{t('changeFilters')}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {strutture.length} {strutture.length === 1 ? t('structureFound') : t('structuresFound')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {strutture.map((s) => (
                <Link
                  key={s.id}
                  href={`/book/${s.id}`}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group"
                >
                  {/* Banner colorato */}
                  <div className={`h-28 bg-gradient-to-br ${TIPO_BG[s.tipo] ?? 'from-gray-400 to-gray-600'} relative`}>
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-0.5 rounded-full text-gray-700">
                      {TIPO_EMOJI[s.tipo]} {TIPO_LABEL[s.tipo] ?? s.tipo}
                    </span>
                    <span className="absolute bottom-3 right-3 text-3xl opacity-60">
                      {TIPO_EMOJI[s.tipo]}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                      {s.nome}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">{s.host.nomeAzienda}</p>

                    {s.descrizione && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3">{s.descrizione}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {(s.citta || s.regione) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[s.citta, s.regione].filter(Boolean).join(', ')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {s.capacitaTotale}p
                      </span>
                      {s.prezzoBase > 0 && (
                        <span className="flex items-center gap-1 text-indigo-600 font-semibold ml-auto">
                          <Tag className="w-3 h-3" />
                          {t('fromPrice')}{s.prezzoBase}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-gray-100 mt-12 py-6">
        <p className="text-center text-xs text-gray-400">
          Powered by{' '}
          <a href="https://otiumweek.it" className="text-indigo-600 hover:underline">Otium Week</a>
          {' '}— {t('platform')}
        </p>
      </div>
    </div>
  )
}
