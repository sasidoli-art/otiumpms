import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Users, Tag, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { getTranslations } from 'next-intl/server'
import BookingForm from '../booking-form'
import BookingLayout from '@/components/book/booking-layout'
import { getStrutturaPubblica } from '@/lib/book/get-struttura-pubblica'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise
  const s = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: { nome: true, descrizione: true },
  })
  if (!s) return { title: 'Non trovato' }
  return { title: `Prenota una camera — ${s.nome}`, description: s.descrizione ?? undefined }
}

export default async function BookingCamerePage({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise
  const t = await getTranslations('booking')
  const tc = await getTranslations('common')

  const struttura = await getStrutturaPubblica(params.strutturaId)
  if (!struttura || !struttura.moduli.prenotazioni) notFound()

  // Carico unità + tariffe per il form
  const full = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: {
      id: true,
      nome: true,
      prezzoBase: true,
      citta: true,
      capacitaTotale: true,
      unita: {
        where: { attiva: true },
        orderBy: { prezzoBase: 'asc' },
        select: {
          id: true, nome: true, descrizione: true, capacita: true, prezzoBase: true,
          tariffe: { orderBy: { dataInizio: 'asc' }, take: 5 },
        },
      },
    },
  })
  if (!full) notFound()

  const prezzoMin = full.unita.length > 0
    ? Math.min(...full.unita.map((u) => u.prezzoBase))
    : full.prezzoBase

  return (
    <BookingLayout struttura={struttura}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonna sinistra — lista unità */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Prenota una camera</h1>
            <p className="text-sm text-gray-500 mt-1">
              {full.unita.length > 0
                ? `${full.unita.length} ${full.unita.length === 1 ? 'sistemazione disponibile' : 'sistemazioni disponibili'} · da €${prezzoMin}`
                : 'Compila il form per richiedere disponibilità'}
            </p>
          </div>

          {full.unita.length > 0 ? (
            <div className="space-y-3">
              {full.unita.map((u) => (
                <div
                  key={u.id}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{u.nome}</h3>
                      {u.descrizione && (
                        <p className="text-sm text-gray-500 mt-1">{u.descrizione}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> max {u.capacita}{' '}
                          {u.capacita === 1 ? tc('person') : tc('people')}
                        </span>
                        {u.tariffe.length > 0 && (
                          <span
                            className="flex items-center gap-1 font-semibold"
                            style={{ color: 'var(--brand-primary)' }}
                          >
                            <Tag className="w-3.5 h-3.5" /> Tariffe speciali disponibili
                          </span>
                        )}
                      </div>
                      {u.tariffe.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {u.tariffe.map((tf) => (
                            <span
                              key={tf.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                              style={{
                                borderColor: tf.colore ?? '#6366f1',
                                color: tf.colore ?? '#6366f1',
                                backgroundColor: `${tf.colore ?? '#6366f1'}15`,
                              }}
                            >
                              {tf.nome} — €{tf.prezzo}
                              <span className="text-gray-400 font-normal">
                                ({format(new Date(tf.dataInizio), 'd MMM', { locale: it })} –{' '}
                                {format(new Date(tf.dataFine), 'd MMM', { locale: it })})
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-xl font-bold"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        €{u.prezzoBase}
                      </p>
                      <p className="text-[11px] text-gray-400">da / notte</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-500">
                Nessuna sistemazione configurata. Compila il form di richiesta.
              </p>
            </div>
          )}
        </div>

        {/* Colonna destra — form prenotazione */}
        <div className="lg:col-span-1">
          <div
            id="prenota"
            className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 lg:sticky lg:top-24"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-1">{t('requestBooking')}</h2>
            <p className="text-xs text-gray-400 mb-5">{t('fillForm')}</p>
            <BookingForm
              struttura={{
                id: full.id,
                nome: full.nome,
                prezzoBase: full.prezzoBase,
                citta: full.citta,
                unita: full.unita.map((u) => ({
                  id: u.id, nome: u.nome, capacita: u.capacita, prezzoBase: u.prezzoBase,
                })),
              }}
            />
          </div>
        </div>
      </div>
    </BookingLayout>
  )
}
