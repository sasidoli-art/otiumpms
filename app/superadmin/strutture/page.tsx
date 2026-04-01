import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import Link from 'next/link'
import { Building2, ExternalLink } from 'lucide-react'

export const metadata = { title: 'Strutture — SuperAdmin' }

const TIPO_COLORI: Record<string, BadgeVariant> = {
  EVENTO: 'purple',
  VENUE: 'blue',
  ESPERIENZA: 'orange',
  ALLOGGIO: 'green',
  SERVIZIO: 'gray',
}

export default async function SuperAdminStrutturePage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ tipo?: string; attiva?: string; host?: string }>
}) {
  const searchParams = await searchParamsPromise
  const filtroTipo = searchParams.tipo || undefined
  const filtroAttiva = searchParams.attiva !== undefined ? searchParams.attiva === '1' : undefined
  const filtroHost = searchParams.host || undefined

  const where: Record<string, unknown> = {}
  if (filtroTipo) where.tipo = filtroTipo
  if (filtroAttiva !== undefined) where.attiva = filtroAttiva
  if (filtroHost) where.hostId = filtroHost

  const [strutture, hosts, totale] = await Promise.all([
    prisma.struttura.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        host: { select: { nomeAzienda: true } },
        _count: { select: { unita: true, prenotazioni: true } },
      },
    }),
    prisma.host.findMany({
      select: { id: true, nomeAzienda: true },
      orderBy: { nomeAzienda: 'asc' },
    }),
    prisma.struttura.count(),
  ])

  const tipi = ['EVENTO', 'VENUE', 'ESPERIENZA', 'ALLOGGIO', 'SERVIZIO']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Strutture</h1>{/* TODO: i18n */}
          <p className="text-sm text-gray-500">{totale} strutture totali sulla piattaforma</p>{/* TODO: i18n */}
        </div>
      </div>

      {/* Filtri */}
      <div className="card">
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>{/* TODO: i18n */}
            <select name="tipo" defaultValue={filtroTipo || ''} className="input text-sm">
              <option value="">Tutti</option>{/* TODO: i18n */}
              {tipi.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stato</label>{/* TODO: i18n */}
            <select name="attiva" defaultValue={searchParams.attiva ?? ''} className="input text-sm">
              <option value="">Tutti</option>{/* TODO: i18n */}
              <option value="1">Attiva</option>{/* TODO: i18n */}
              <option value="0">Inattiva</option>{/* TODO: i18n */}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Host</label>
            <select name="host" defaultValue={filtroHost || ''} className="input text-sm">
              <option value="">Tutti</option>{/* TODO: i18n */}
              {hosts.map(h => (
                <option key={h.id} value={h.id}>{h.nomeAzienda}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary text-sm">Filtra</button>{/* TODO: i18n */}
          <Link href="/superadmin/strutture" className="btn btn-ghost text-sm">Reset</Link>{/* TODO: i18n */}
        </form>
      </div>

      {/* Tabella */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Nome</th>{/* TODO: i18n */}
                <th className="table-th">Tipo</th>{/* TODO: i18n */}
                <th className="table-th">Host</th>
                <th className="table-th">Città</th>{/* TODO: i18n */}
                <th className="table-th">Stato</th>{/* TODO: i18n */}
                <th className="table-th text-right">Unità</th>{/* TODO: i18n */}
                <th className="table-th text-right">Prenotazioni</th>{/* TODO: i18n */}
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {strutture.map(s => (
                <tr key={s.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-slate-100">{s.nome}</span>
                    </div>
                  </td>
                  <td className="table-td">
                    <Badge variant={TIPO_COLORI[s.tipo] || 'gray'}>{s.tipo}</Badge>
                  </td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{s.host.nomeAzienda}</td>
                  <td className="table-td text-gray-500">{s.citta || '—'}</td>
                  <td className="table-td">
                    <Badge variant={s.attiva ? 'green' : 'red'}>
                      {s.attiva ? 'Attiva' : 'Inattiva'}{/* TODO: i18n */}
                    </Badge>
                  </td>
                  <td className="table-td text-right">{s._count.unita}</td>
                  <td className="table-td text-right font-medium">{s._count.prenotazioni}</td>
                  <td className="table-td">
                    <Link
                      href={`/admin/clienti/${s.hostId}`}
                      className="text-brand-600 hover:underline text-xs flex items-center gap-1"
                    >
                      Gestisci <ExternalLink className="w-3 h-3" />{/* TODO: i18n */}
                    </Link>
                  </td>
                </tr>
              ))}
              {strutture.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-td text-center text-gray-400 py-8">
                    Nessuna struttura trovata{/* TODO: i18n */}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
