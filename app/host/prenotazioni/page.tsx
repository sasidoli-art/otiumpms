import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { MessageSquare, Plus } from 'lucide-react'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { isStatoPrenotazione } from '@/lib/validations'
import { ExportButton, ImportButton } from './import-export'

const STATI_PRENOTAZIONE = [
  { value: '', label: 'Tutte' },
  { value: 'RICHIESTA', label: 'In attesa' },
  { value: 'CONFERMATA', label: 'Confermate' },
  { value: 'ANNULLATA', label: 'Annullate' },
  { value: 'COMPLETATA', label: 'Completate' },
  { value: 'NO_SHOW', label: 'No show' },
]

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

function statoLabel(stato: string) {
  switch (stato) {
    case 'RICHIESTA': return 'In attesa'
    case 'CONFERMATA': return 'Confermata'
    case 'ANNULLATA': return 'Annullata'
    case 'COMPLETATA': return 'Completata'
    case 'NO_SHOW': return 'No show'
    default: return stato
  }
}

export default async function PrenotazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; q?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const { stato = '', q = '' } = await searchParams

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: hostId,
      ...(stato && isStatoPrenotazione(stato) ? { stato } : {}),
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
      struttura: { select: { nome: true } },
      unita: { select: { nome: true } },
      chat: { include: { messaggi: { select: { id: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const countByStato = await prisma.prenotazione.groupBy({
    by: ['stato'],
    where: { hostId: hostId },
    _count: true,
  })
  const mapCount = Object.fromEntries(countByStato.map((c) => [c.stato, c._count]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prenotazioni</h1>
          <p className="text-sm text-gray-500 mt-1">
            {prenotazioni.length} trovate
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton stato={stato} />
          <ImportButton />
          <Link href="/host/prenotazioni/nuova" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuova manuale
          </Link>
        </div>
      </div>

      {/* Filtri stato */}
      <div className="flex gap-2 flex-wrap">
        {STATI_PRENOTAZIONE.map((s) => (
          <Link
            key={s.value}
            href={`/host/prenotazioni?stato=${s.value}${q ? `&q=${q}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              stato === s.value
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
            {s.value && mapCount[s.value] ? ` (${mapCount[s.value]})` : ''}
          </Link>
        ))}
      </div>

      {/* Ricerca */}
      <form method="GET" action="/host/prenotazioni" className="flex gap-2">
        {stato && <input type="hidden" name="stato" value={stato} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Cerca ospite, email..."
          className="input max-w-xs"
        />
        <button type="submit" className="btn-secondary">Cerca</button>
      </form>

      {/* Tabella */}
      {prenotazioni.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">
          <p>Nessuna prenotazione trovata</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Ospite</th>
                  <th className="table-th">Struttura</th>
                  <th className="table-th">Arrivo</th>
                  <th className="table-th">Partenza</th>
                  <th className="table-th">Ospiti</th>
                  <th className="table-th">Totale</th>
                  <th className="table-th">Stato</th>
                  <th className="table-th">Chat</th>
                  <th className="table-th" />
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
                    <td className="table-td text-sm text-gray-600">
                      {p.struttura?.nome ?? '—'}
                      {p.unita && <div className="text-xs text-gray-400">{p.unita.nome}</div>}
                    </td>
                    <td className="table-td text-sm">
                      {format(new Date(p.dataArrivo), 'd MMM yyyy', { locale: it })}
                    </td>
                    <td className="table-td text-sm text-gray-500">
                      {p.dataPartenza
                        ? format(new Date(p.dataPartenza), 'd MMM yyyy', { locale: it })
                        : '—'}
                    </td>
                    <td className="table-td text-center text-sm">{p.numOspiti}</td>
                    <td className="table-td text-sm text-gray-600">
                      <div className="font-medium">€{p.prezzoTotale?.toFixed(2) ?? '—'}</div>
                      {p.tassaSoggiorno && (
                        <div className="text-xs text-gray-400">+€{p.tassaSoggiorno.toFixed(2)}/n</div>
                      )}
                    </td>
                    <td className="table-td">
                      <Badge variant={statoColor(p.stato)}>
                        {statoLabel(p.stato)}
                      </Badge>
                    </td>
                    <td className="table-td text-center">
                      {p.chat ? (
                        <Link
                          href={`/host/prenotazioni/${p.id}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {p.chat.messaggi.length}
                        </Link>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="table-td text-right">
                      <Link
                        href={`/host/prenotazioni/${p.id}`}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Dettaglio →
                      </Link>
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
