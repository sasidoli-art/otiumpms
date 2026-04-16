import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { MapPin, Users, Tag, Star, ArrowRight, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import BookingForm from './booking-form'
import { getTranslations } from 'next-intl/server'
import { PublicConciergeWidget } from '@/components/book/public-concierge-widget'

const TIPO_COLOR: Record<string, string> = {
  EVENTO: 'bg-purple-100 text-purple-700',
  VENUE: 'bg-blue-100 text-blue-700',
  ESPERIENZA: 'bg-amber-100 text-amber-700',
  ALLOGGIO: 'bg-green-100 text-green-700',
  SERVIZIO: 'bg-gray-100 text-gray-700',
}

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const params = await paramsPromise
  const s = await prisma.struttura.findFirst({ where: { id: params.strutturaId, attiva: true }, select: { nome: true, descrizione: true } })
  if (!s) return { title: 'Non trovato' }
  return { title: `${s.nome} — Otium Week`, description: s.descrizione ?? undefined }
}

export default async function ProfiloStrutturaPage({ params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const params = await paramsPromise
  const t = await getTranslations('booking')
  const tc = await getTranslations('common')
  const ts = await getTranslations('structureTypes')

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    include: {
      unita: {
        where: { attiva: true },
        include: {
          tariffe: { orderBy: { dataInizio: 'asc' }, take: 5 },
        },
        orderBy: { prezzoBase: 'asc' },
      },
      host: { select: { nomeAzienda: true, sitoWeb: true, logo: true, telefono: true } },
      _count: { select: { prenotazioni: true } },
    },
  })

  if (!struttura) notFound()

  const [numPacchetti, numTrattamentiSpa] = await Promise.all([
    prisma.pacchetto.count({
      where: {
        strutturaId: struttura.id,
        attivo: true,
        OR: [{ dataFine: null }, { dataFine: { gte: new Date() } }],
      },
    }),
    prisma.trattamentoSpa.count({
      where: { attivo: true, host: { strutture: { some: { id: struttura.id } } } },
    }),
  ])

  const prezzoMin = struttura.unita.length > 0
    ? Math.min(...struttura.unita.map(u => u.prezzoBase))
    : struttura.prezzoBase

  const TIPO_LABEL: Record<string, string> = {
    EVENTO: ts('event'), VENUE: ts('venue'), ESPERIENZA: ts('experience'), ALLOGGIO: ts('accommodation'), SERVIZIO: ts('service'),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://otiumweek.it" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-indigo-700 text-sm">Otium Week</span>
          </a>
          <a
            href="#prenota"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 transition-colors"
          >
            {t('bookNow')} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Colonna sinistra — info struttura */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hero */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Banner colore */}
              <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                <div className="absolute inset-0 bg-black/10" />
                <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${TIPO_COLOR[struttura.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                  {TIPO_LABEL[struttura.tipo] ?? struttura.tipo}
                </span>
              </div>
              <div className="px-6 pb-6 -mt-6">
                <div className="w-14 h-14 rounded-xl bg-white shadow-md flex items-center justify-center text-2xl mb-3 border border-gray-100">
                  {struttura.tipo === 'ALLOGGIO' ? '🏠' : struttura.tipo === 'EVENTO' ? '🎭' : struttura.tipo === 'ESPERIENZA' ? '✨' : struttura.tipo === 'VENUE' ? '🏛️' : '🎯'}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{struttura.nome}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                  <span className="font-medium text-gray-700">{struttura.host.nomeAzienda}</span>
                  {(struttura.citta || struttura.regione) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {[struttura.citta, struttura.regione].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {struttura._count.prenotazioni > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {struttura._count.prenotazioni} {tc('bookings')}
                    </span>
                  )}
                </div>
                {struttura.descrizione && (
                  <p className="mt-4 text-gray-600 text-sm leading-relaxed">{struttura.descrizione}</p>
                )}
              </div>
            </div>

            {/* Info rapide */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('capacity')}</p>
                  <p className="text-sm font-semibold text-gray-800">{struttura.capacitaTotale} {struttura.capacitaTotale === 1 ? tc('person') : tc('people')}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tc('from')}</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {prezzoMin > 0 ? `€${prezzoMin}` : t('free')}
                  </p>
                </div>
              </div>
              {struttura.indirizzo && (
                <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{tc('address')}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{struttura.indirizzo}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Unità prenotabili */}
            {struttura.unita.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">
                  {struttura.unita.length === 1 ? t('optionAvailable') : t('optionsAvailable')}
                </h2>
                <div className="space-y-4">
                  {struttura.unita.map((u) => (
                    <div key={u.id} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm">{u.nome}</h3>
                          {u.descrizione && (
                            <p className="text-xs text-gray-500 mt-1">{u.descrizione}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {t('max')} {u.capacita} {u.capacita === 1 ? tc('person') : tc('people')}
                            </span>
                            {u.tariffe.length > 0 && (
                              <span className="text-xs text-indigo-600 font-medium">
                                {t('specialRates')}
                              </span>
                            )}
                          </div>
                          {/* Tariffe periodo */}
                          {u.tariffe.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {u.tariffe.map((tf) => (
                                <span
                                  key={tf.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                                  style={{ borderColor: tf.colore ?? '#6366f1', color: tf.colore ?? '#6366f1', backgroundColor: `${tf.colore ?? '#6366f1'}15` }}
                                >
                                  {tf.nome} — €{tf.prezzo}
                                  <span className="text-gray-400 font-normal">
                                    ({format(new Date(tf.dataInizio), 'd MMM', { locale: it })} – {format(new Date(tf.dataFine), 'd MMM', { locale: it })})
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-indigo-700">
                            {u.prezzoBase > 0 ? `€${u.prezzoBase}` : t('free')}
                          </p>
                          <p className="text-xs text-gray-400">{t('form.basePrice')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contatti host */}
            {(struttura.host.sitoWeb || struttura.host.telefono) && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-3">{t('organizer')}</h2>
                <p className="text-sm font-medium text-gray-700 mb-2">{struttura.host.nomeAzienda}</p>
                <div className="flex gap-4 flex-wrap">
                  {struttura.host.sitoWeb && (
                    <a href={struttura.host.sitoWeb} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">
                      🌐 {struttura.host.sitoWeb.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {struttura.host.telefono && (
                    <a href={`tel:${struttura.host.telefono}`} className="text-sm text-gray-600 hover:text-gray-900">
                      📞 {struttura.host.telefono}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Colonna destra — form prenotazione */}
          <div className="lg:col-span-1 space-y-4">
            {numPacchetti > 0 && (
              <a
                href={`/book/${struttura.id}/pacchetti`}
                className="block bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white hover:brightness-110 transition-all shadow-sm"
              >
                <p className="font-bold text-sm">{t('eventPackages')}</p>
                <p className="text-indigo-200 text-xs mt-0.5">
                  {numPacchetti} {numPacchetti === 1 ? t('offerAvailable') : t('offersAvailable')} — {t('discoverPackages')}
                </p>
              </a>
            )}
            {numTrattamentiSpa > 0 && (
              <a
                href={`/book/${struttura.id}/spa`}
                className="block bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-4 text-white hover:brightness-110 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <p className="font-bold text-sm">{t('spaWellness')}</p>
                </div>
                <p className="text-purple-200 text-xs">
                  {numTrattamentiSpa} {numTrattamentiSpa === 1 ? t('treatmentAvailable') : t('treatmentsAvailable')} — {t('bookOnline')}
                </p>
              </a>
            )}
            <div id="prenota" className="bg-white rounded-2xl shadow-sm p-6 sticky top-20">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t('requestBooking')}</h2>
              <p className="text-xs text-gray-400 mb-5">{t('fillForm')}</p>
              <BookingForm struttura={{
                id: struttura.id,
                nome: struttura.nome,
                prezzoBase: struttura.prezzoBase,
                citta: struttura.citta,
                unita: struttura.unita.map(u => ({ id: u.id, nome: u.nome, capacita: u.capacita, prezzoBase: u.prezzoBase }))
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 mt-12 py-6">
        <p className="text-center text-xs text-gray-400">
          Powered by{' '}
          <a href="https://otiumweek.it" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
            Otium Week
          </a>
          {' '}— {t('platform')}
        </p>
      </div>

      <PublicConciergeWidget
        strutturaId={struttura.id}
        strutturaNome={struttura.nome}
        lingua="it"
      />
    </div>
  )
}
