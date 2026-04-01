import { prisma } from '@/lib/db'
import { formatData, categoriaEventoLabel, statoEventoLabel, statoEventoColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { EventoActions } from './evento-actions'
import { getTranslations } from 'next-intl/server'

interface Props {
  searchParams: Promise<{ q?: string; stato?: string; categoria?: string }>
}

export default async function AdminEventiPage({ searchParams }: Props) {
  const t = await getTranslations('admin.events')
  const tc = await getTranslations('common')
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
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {eventi.length} {t('title').toLowerCase()} · {inAttesa > 0 && <span className="text-orange-600 font-medium">{inAttesa} {t('pendingApproval')}</span>}
          </p>
        </div>
      </div>

      {/* Filtri */}
      <div className="card p-4 mb-6">
        <form method="GET" className="flex flex-wrap gap-3">
          <input name="q" defaultValue={q} placeholder={t('searchPlaceholder')} className="input flex-1 min-w-[200px]" />
          <select name="stato" defaultValue={stato ?? ''} className="input w-auto">
            <option value="">{tc('allStatuses')}</option>
            <option value="IN_ATTESA">In attesa</option>{/* TODO: i18n */}
            <option value="APPROVATO">Approvati</option>{/* TODO: i18n */}
            <option value="BOZZA">Bozze</option>{/* TODO: i18n */}
            <option value="RIFIUTATO">Rifiutati</option>{/* TODO: i18n */}
            <option value="SCADUTO">Scaduti</option>{/* TODO: i18n */}
          </select>
          <select name="categoria" defaultValue={categoria ?? ''} className="input w-auto">
            <option value="">{tc('allCategories')}</option>
            <option value="MUSICA">{t('music')}</option>
            <option value="ARTE">{t('art')}</option>
            <option value="TEATRO">{t('theater')}</option>
            <option value="FOOD">{t('food')}</option>
            <option value="SPORT">{t('sport')}</option>
            <option value="FESTIVAL">{t('festival')}</option>
            <option value="FIERA">{t('fair')}</option>
            <option value="CONFERENZA">{t('conference')}</option>
            <option value="CINEMA">{t('cinema')}</option>
          </select>
          <button type="submit" className="btn-primary">{tc('filter')}</button>
          {(q || stato || categoria) && <Link href="/admin/eventi" className="btn-secondary">{tc('reset')}</Link>}
        </form>
      </div>

      {/* Tabella */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">{t('event')}</th>
                <th className="table-th">{t('organizer')}</th>
                <th className="table-th">{tc('category')}</th>
                <th className="table-th">{tc('date')}</th>
                <th className="table-th">Views</th>
                <th className="table-th">{tc('status')}</th>
                <th className="table-th">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {eventi.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">{tc('noResults')}</td></tr>
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
