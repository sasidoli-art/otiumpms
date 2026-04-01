import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Tag, LayoutGrid, ExternalLink, Settings, Calendar, MapPin } from 'lucide-react'
import { formatValuta } from '@/lib/utils'
import { generateIcalToken } from '@/lib/ical'
import IcalCopyButton from './ical-copy-button'
import { getTranslations } from 'next-intl/server'

export default async function StrutturaDetailPage({
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
    include: {
      unita: {
        include: {
          tariffe: { orderBy: { dataInizio: 'asc' } },
          _count: { select: { prenotazioni: true, disponibilita: true } },
        },
        orderBy: { nome: 'asc' },
      },
      _count: { select: { prenotazioni: true } },
    },
  })

  if (!struttura) notFound()

  const t = await getTranslations('host.structures')
  const tc = await getTranslations('common')

  const tipoLabel: Record<string, string> = {
    EVENTO: t('event'), VENUE: t('venue'), ESPERIENZA: t('experience'), ALLOGGIO: t('accommodation'), SERVIZIO: t('service'),
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const publicUrl = `${baseUrl}/book/${struttura.id}`

  // Token iCal generati server-side — mai esposti al client prima della copia
  const struttoraIcalUrl = `${baseUrl}/api/host/strutture/${struttura.id}/ical?token=${generateIcalToken(struttura.id)}`
  const unitaIcalUrls = struttura.unita.map((u) => ({
    id: u.id,
    nome: u.nome,
    url: `${baseUrl}/api/host/strutture/${struttura.id}/unita/${u.id}/ical?token=${generateIcalToken(u.id)}`,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/host/strutture" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{struttura.nome}</h1>
            <p className="text-sm text-gray-500">
              {tipoLabel[struttura.tipo] ?? struttura.tipo}
              {struttura.citta ? ` · ${struttura.citta}` : ''}
              {struttura.regione ? `, ${struttura.regione}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ExternalLink className="w-4 h-4" /> {t('publicPage')}
          </a>
        </div>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{struttura.unita.length}</p>
          <p className="text-sm text-gray-500">{t('bookableUnits')}</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{struttura._count.prenotazioni}</p>
          <p className="text-sm text-gray-500">{t('totalBookings')}</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-brand-600">{formatValuta(struttura.prezzoBase)}</p>
          <p className="text-sm text-gray-500">{t('basePrice')}</p>
        </div>
      </div>

      {/* Nav azioni */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href={`/host/strutture/${struttura.id}/pannello`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <LayoutGrid className="w-4 h-4" />
          {t('roomPanel')}
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/disponibilita`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-brand-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          {t('availability')}
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/tariffe`}
          className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
        >
          <Tag className="w-4 h-4" />
          {t('rates')}
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/prenotazioni?strutturaId=${struttura.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          {tc('bookings')}
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/eventi-locali`}
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          {t('localEvents')}
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/impostazioni`}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <Settings className="w-4 h-4" />
          {t('settings')}
        </Link>
      </div>

      {/* ─── Immagini struttura ─────────────────────────────────────────── */}
      <StrutturaImages strutturaId={struttura.id} immagini={struttura.immagini} />

      {/* ─── Channel Manager iCal ─────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900">{t('calendarSync')}</h2>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">{t('channelManager')}</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {t('calendarSyncDesc')}
        </p>

        {/* Link struttura intera */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('wholeStructure')}
            </p>
            <IcalCopyButton label={struttura.nome} url={struttoraIcalUrl} />
          </div>

          {/* Link per singola unità */}
          {unitaIcalUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('perUnit')}
              </p>
              <div className="space-y-2">
                {unitaIcalUrls.map((u) => (
                  <IcalCopyButton key={u.id} label={u.nome} url={u.url} />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 pt-1">
            {t('calendarNote')}
          </p>
        </div>
      </div>

      {/* Unità prenotabili */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{t('bookableUnits')}</h2>
          <NuovaUnitaButton strutturaId={struttura.id} />
        </div>

        {struttura.unita.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            {t('noUnits')}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {struttura.unita.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{u.nome}</p>
                  <p className="text-sm text-gray-500">
                    {t('capacityFrom', { capacity: u.capacita, price: u.prezzoBase.toString() })}
                    {u._count.prenotazioni > 0 && ` · ${u._count.prenotazioni} ${t('bk')}`}
                    {u.tariffe.length > 0 && ` · ${u.tariffe.length} ${t('ratesCount')}`}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${u.attiva ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {u.attiva ? tc('active') : tc('inactive')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Descrizione */}
      {struttura.descrizione && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-2">{tc('description')}</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{struttura.descrizione}</p>
        </div>
      )}
    </div>
  )
}

import NuovaUnitaButton from './nuova-unita-button'
import StrutturaImages from './struttura-images'
