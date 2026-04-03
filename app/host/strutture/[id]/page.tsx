import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Tag, LayoutGrid, ExternalLink, Settings, Calendar, MapPin, Monitor } from 'lucide-react'
import { formatValuta } from '@/lib/utils'
import { generateIcalToken } from '@/lib/ical'
import IcalCopyButton from './ical-copy-button'
import { isHostAuthorized } from '@/lib/permissions'

const tipoLabel: Record<string, string> = {
  EVENTO: 'Evento', VENUE: 'Venue', ESPERIENZA: 'Esperienza', ALLOGGIO: 'Alloggio', SERVIZIO: 'Servizio',
}

export default async function StrutturaDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
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
            <ExternalLink className="w-4 h-4" /> Pagina pubblica
          </a>
          <DeleteStrutturaButton strutturaId={struttura.id} strutturaNome={struttura.nome} />
        </div>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{struttura.unita.length}</p>
          <p className="text-sm text-gray-500">Unità prenotabili</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{struttura._count.prenotazioni}</p>
          <p className="text-sm text-gray-500">Prenotazioni totali</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-brand-600">{formatValuta(struttura.prezzoBase)}</p>
          <p className="text-sm text-gray-500">Prezzo base</p>
        </div>
      </div>

      {/* Nav azioni */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href={`/host/strutture/${struttura.id}/pannello`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <LayoutGrid className="w-4 h-4" />
          Pannello stanze
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/disponibilita`}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-brand-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          Disponibilità
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/tariffe`}
          className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
        >
          <Tag className="w-4 h-4" />
          Tariffe
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/prenotazioni?strutturaId=${struttura.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          Prenotazioni
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/eventi-locali`}
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          Eventi locali
        </Link>
        <Link
          href={`/host/strutture/${struttura.id}/impostazioni`}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Impostazioni
        </Link>
        <a
          href={`/reception/display/${struttura.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Monitor className="w-4 h-4" />
          Display firma reception
        </a>
      </div>

      {/* ─── Channel Manager iCal ─────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900">Sincronizzazione calendario</h2>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">Channel Manager</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Incolla questi link in Booking.com, Airbnb o Google Calendar per sincronizzare automaticamente le disponibilità.
        </p>

        {/* Link struttura intera */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Tutta la struttura
            </p>
            <IcalCopyButton label={struttura.nome} url={struttoraIcalUrl} />
          </div>

          {/* Link per singola unità */}
          {unitaIcalUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Per unità
              </p>
              <div className="space-y-2">
                {unitaIcalUrls.map((u) => (
                  <IcalCopyButton key={u.id} label={u.nome} url={u.url} />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 pt-1">
            Il link è unico e sicuro. Il calendario si aggiorna ogni 4 ore.
            Per rigenerare il link contatta il supporto.
          </p>
        </div>
      </div>

      {/* Unità prenotabili */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Unità prenotabili</h2>
          <NuovaUnitaButton strutturaId={struttura.id} />
        </div>

        {struttura.unita.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            Nessuna unità — aggiungi un posto, camera, tavolo o slot
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {struttura.unita.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{u.nome}</p>
                  <p className="text-sm text-gray-500">
                    Capienza: {u.capacita} · da {formatValuta(u.prezzoBase)}
                    {u.piano !== null && ` · P${u.piano}`}
                    {u._count.prenotazioni > 0 && ` · ${u._count.prenotazioni} pren.`}
                    {u.tariffe.length > 0 && ` · ${u.tariffe.length} tariffe`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${u.attiva ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {u.attiva ? 'Attiva' : 'Disattiva'}
                  </span>
                  <UnitaRowActions
                    unita={{ id: u.id, nome: u.nome, capacita: u.capacita, prezzoBase: u.prezzoBase, descrizione: u.descrizione, piano: u.piano, attiva: u.attiva }}
                    strutturaId={struttura.id}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Descrizione */}
      {struttura.descrizione && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Descrizione</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{struttura.descrizione}</p>
        </div>
      )}
    </div>
  )
}

import NuovaUnitaButton from './nuova-unita-button'
import UnitaRowActions from './unita-row-actions'
import DeleteStrutturaButton from './delete-struttura-button'
