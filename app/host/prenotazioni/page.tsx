import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { MessageSquare, Plus } from 'lucide-react'
import { Badge, STATO_PRENOTAZIONE } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { isStatoPrenotazione } from '@/lib/validations'
import { ExportButton, ImportButton } from './import-export'
import { isHostAuthorized } from '@/lib/permissions'
import { getStrutturaAttivaId } from '@/lib/struttura-attiva'

const FILTRI_STATO = [
  { value: '', label: 'Tutte' },
  { value: 'RICHIESTA', label: 'In attesa' },
  { value: 'CONFERMATA', label: 'Confermate' },
  { value: 'ANNULLATA', label: 'Annullate' },
  { value: 'COMPLETATA', label: 'Completate' },
  { value: 'NO_SHOW', label: 'No show' },
]

export default async function PrenotazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; q?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  const strutturaId = await getStrutturaAttivaId(hostId)

  const { stato = '', q = '' } = await searchParams

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId,
      ...(strutturaId && { strutturaId }),
      ...(stato && isStatoPrenotazione(stato) ? { stato } : {}),
      ...(q ? {
        OR: [
          { guestNome: { contains: q, mode: 'insensitive' } },
          { guestCognome: { contains: q, mode: 'insensitive' } },
          { guestEmail: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
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
    where: { hostId, ...(strutturaId && { strutturaId }) },
    _count: true,
  })
  const mapCount = Object.fromEntries(countByStato.map(c => [c.stato, c._count]))

  return (
    <div className="stack-lg">
      {/* ── Header ── */}
      <PageHeader
        title="Prenotazioni"
        description={`${prenotazioni.length} trovate`}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton stato={stato} />
            <ImportButton />
            <Link href="/host/prenotazioni/nuova" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuova
            </Link>
          </div>
        }
      />

      {/* ── Filtri stato ── */}
      <div className="flex gap-2 flex-wrap">
        {FILTRI_STATO.map(s => {
          const isActive = stato === s.value
          return (
            <Link
              key={s.value}
              href={`/host/prenotazioni?stato=${s.value}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
              }`}
            >
              {s.label}
              {s.value && mapCount[s.value] ? ` (${mapCount[s.value]})` : ''}
            </Link>
          )
        })}
      </div>

      {/* ── Ricerca ── */}
      <form method="GET" action="/host/prenotazioni" className="flex gap-2">
        {stato && <input type="hidden" name="stato" value={stato} />}
        <input name="q" defaultValue={q} placeholder="Cerca ospite, email..." className="input max-w-xs" />
        <button type="submit" className="btn-secondary">Cerca</button>
      </form>

      {/* ── Tabella ── */}
      {prenotazioni.length === 0 ? (
        <Card>
          <EmptyState
            icon="BookOpen"
            titolo="Nessuna prenotazione trovata"
            descrizione="Modifica i filtri oppure crea una nuova prenotazione."
            azione={{ label: 'Nuova prenotazione', href: '/host/prenotazioni/nuova' }}
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="table-th">Ospite</th>
                  <th className="table-th hidden md:table-cell">Struttura</th>
                  <th className="table-th">Arrivo</th>
                  <th className="table-th hidden md:table-cell">Partenza</th>
                  <th className="table-th hidden lg:table-cell">Ospiti</th>
                  <th className="table-th hidden md:table-cell">Totale</th>
                  <th className="table-th">Stato</th>
                  <th className="table-th hidden lg:table-cell">Chat</th>
                  <th className="table-th" />
                </tr>
              </thead>
              <tbody>
                {prenotazioni.map(p => {
                  const cfg = STATO_PRENOTAZIONE[p.stato] || { color: 'gray' as const, label: p.stato }
                  return (
                    <tr key={p.id} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="table-td">
                        <div className="font-medium text-[var(--text-primary)]">{p.guestNome} {p.guestCognome}</div>
                        <div className="text-xs text-[var(--text-tertiary)]">{p.guestEmail}</div>
                      </td>
                      <td className="table-td text-sm hidden md:table-cell">
                        {p.struttura?.nome ?? '—'}
                        {p.unita && <div className="text-xs text-[var(--text-tertiary)]">{p.unita.nome}</div>}
                      </td>
                      <td className="table-td text-sm">
                        {format(new Date(p.dataArrivo), 'd MMM yyyy', { locale: it })}
                      </td>
                      <td className="table-td text-sm text-[var(--text-secondary)] hidden md:table-cell">
                        {p.dataPartenza ? format(new Date(p.dataPartenza), 'd MMM yyyy', { locale: it }) : '—'}
                      </td>
                      <td className="table-td text-center text-sm hidden lg:table-cell">{p.numOspiti}</td>
                      <td className="table-td text-sm hidden md:table-cell">
                        <span className="font-medium">€{p.prezzoTotale?.toFixed(2) ?? '—'}</span>
                      </td>
                      <td className="table-td">
                        <Badge variant="status" color={cfg.color}>{cfg.label}</Badge>
                      </td>
                      <td className="table-td text-center hidden lg:table-cell">
                        {p.chat ? (
                          <Link href={`/host/prenotazioni/${p.id}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                            <MessageSquare className="w-3.5 h-3.5" /> {p.chat.messaggi.length}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-tertiary)] text-xs">—</span>
                        )}
                      </td>
                      <td className="table-td text-right">
                        <Link href={`/host/prenotazioni/${p.id}`} className="text-xs text-brand-600 hover:underline">
                          Dettaglio →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
