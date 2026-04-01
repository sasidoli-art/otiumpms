import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { isStatoPrenotazione } from '@/lib/validations'
import { getTranslations } from 'next-intl/server'

function statoColor(stato: string): BadgeVariant {
  switch (stato) {
    case 'RICHIESTA': return 'yellow'
    case 'CONFERMATA': return 'green'
    case 'ANNULLATA': return 'red'
    case 'COMPLETATA': return 'blue'
    case 'NO_SHOW': return 'gray'
    default: return 'gray'
  }
}

export default async function AdminPrenotazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; q?: string; hostId?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const t = await getTranslations('admin.bookings')
  const tc = await getTranslations('common')
  const { stato = '', q = '', hostId = '' } = await searchParams

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      ...(stato && isStatoPrenotazione(stato) ? { stato } : {}),
      ...(hostId ? { hostId } : {}),
      ...(q
        ? {
            OR: [
              { guestNome: { contains: q, mode: 'insensitive' } },
              { guestCognome: { contains: q, mode: 'insensitive' } },
              { guestEmail: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      host: { select: { nomeAzienda: true } },
      struttura: { select: { nome: true } },
      chat: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totali = await prisma.prenotazione.groupBy({
    by: ['stato'],
    _count: true,
  })
  const mapTotali = Object.fromEntries(totali.map((t) => [t.stato, t._count]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Counter per stato */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { stato: 'RICHIESTA', label: t('pending'), color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
          { stato: 'CONFERMATA', label: t('confirmed'), color: 'bg-green-50 border-green-200 text-green-800' },
          { stato: 'COMPLETATA', label: t('completed'), color: 'bg-blue-50 border-blue-200 text-blue-800' },
          { stato: 'ANNULLATA', label: t('cancelled'), color: 'bg-red-50 border-red-200 text-red-800' },
          { stato: 'NO_SHOW', label: t('noShow'), color: 'bg-gray-50 border-gray-200 text-gray-800' },
        ].map((s) => (
          <Link
            key={s.stato}
            href={`/admin/prenotazioni?stato=${s.stato}`}
            className={`border rounded-xl px-4 py-3 text-center transition-all hover:shadow-sm ${s.color} ${stato === s.stato ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
          >
            <p className="text-2xl font-bold">{mapTotali[s.stato] ?? 0}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Filtri */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/admin/prenotazioni"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !stato ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {tc('all')} ({Object.values(mapTotali).reduce((a, b) => a + b, 0)})
        </Link>
        <form method="GET" action="/admin/prenotazioni" className="flex gap-2 ml-auto">
          {stato && <input type="hidden" name="stato" value={stato} />}
          <input name="q" defaultValue={q} placeholder={tc('search') + '...'} className="input text-sm" />
          <button type="submit" className="btn-secondary text-sm">{tc('search')}</button>
        </form>
      </div>

      {/* Tabella */}
      {prenotazioni.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">{tc('noResults')}</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Ospite</th>{/* TODO: i18n */}
                  <th className="table-th">Host</th>
                  <th className="table-th">{tc('structure')}</th>
                  <th className="table-th">Arrivo</th>{/* TODO: i18n */}
                  <th className="table-th">{tc('status')}</th>
                  <th className="table-th">Chat</th>
                  <th className="table-th">Ricevuta</th>{/* TODO: i18n */}
                </tr>
              </thead>
              <tbody>
                {prenotazioni.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td">
                      <div className="font-medium text-gray-900">
                        {p.guestNome} {p.guestCognome}
                      </div>
                      <div className="text-xs text-gray-400">{p.guestEmail}</div>
                    </td>
                    <td className="table-td text-sm text-gray-600">{p.host.nomeAzienda}</td>
                    <td className="table-td text-sm text-gray-600">{p.struttura?.nome ?? '—'}</td>
                    <td className="table-td text-sm">
                      {format(new Date(p.dataArrivo), 'd MMM yyyy', { locale: it })}
                    </td>
                    <td className="table-td">
                      <Badge variant={statoColor(p.stato)}>
                        {p.stato === 'RICHIESTA' ? t('pending') :
                         p.stato === 'CONFERMATA' ? t('confirmed') :
                         p.stato === 'ANNULLATA' ? t('cancelled') :
                         p.stato === 'COMPLETATA' ? t('completed') :
                         p.stato === 'NO_SHOW' ? t('noShow') : p.stato}
                      </Badge>
                    </td>
                    <td className="table-td text-center">
                      {p.chat ? (
                        <span className="text-xs text-green-600">✓</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="table-td text-sm text-gray-400">
                      {format(new Date(p.createdAt), 'd MMM yyyy', { locale: it })}
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
