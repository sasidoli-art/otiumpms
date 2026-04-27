import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { MessageSquare, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PRENOTAZIONE_BADGES, type BadgeConfig } from '@/lib/status-badges'
import { formatValuta, formatData } from '@/lib/formatters'
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

      {/* ── Filtri stato (P5.1: pill morbide bg-primary-50/text-primary-700) ── */}
      <div className="flex gap-2 flex-wrap">
        {FILTRI_STATO.map(s => {
          const isActive = stato === s.value
          const count = s.value ? mapCount[s.value] : null
          return (
            <Link
              key={s.value}
              href={`/host/prenotazioni?stato=${s.value}${q ? `&q=${q}` : ''}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {s.label}
              {count ? (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'
                }`}>{count}</span>
              ) : null}
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
            kind="prenotazioni"
            titolo={stato || q ? 'Nessuna prenotazione trovata' : undefined}
            descrizione={stato || q ? 'Modifica i filtri oppure crea una nuova prenotazione.' : undefined}
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
                  const cfg: BadgeConfig =
                    PRENOTAZIONE_BADGES[p.stato as keyof typeof PRENOTAZIONE_BADGES]
                    ?? { color: 'neutral', label: p.stato }
                  return (
                    <tr key={p.id} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="table-td">
                        <div className="flex items-center gap-2.5">
                          <GuestAvatar nome={p.guestNome} cognome={p.guestCognome} />
                          <div className="min-w-0">
                            <div className="font-medium text-[var(--text-primary)] truncate">{p.guestNome} {p.guestCognome}</div>
                            <div className="text-xs text-[var(--text-tertiary)] truncate">{p.guestEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-sm hidden md:table-cell">
                        {p.struttura?.nome ?? '—'}
                        {p.unita && <div className="text-xs text-[var(--text-tertiary)]">{p.unita.nome}</div>}
                      </td>
                      <td className="table-td text-sm tabular-nums">
                        {formatData(p.dataArrivo)}
                      </td>
                      <td className="table-td text-sm text-[var(--text-secondary)] hidden md:table-cell tabular-nums">
                        {p.dataPartenza ? formatData(p.dataPartenza) : '—'}
                      </td>
                      <td className="table-td text-center text-sm hidden lg:table-cell tabular-nums">{p.numOspiti}</td>
                      <td className="table-td text-sm hidden md:table-cell">
                        <span className="font-medium tabular-nums">{formatValuta(p.prezzoTotale)}</span>
                      </td>
                      <td className="table-td">
                        <Badge color={cfg.color} icon={cfg.icon} pulse={cfg.pulse}>{cfg.label}</Badge>
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

// ─── Avatar squadrato 28px con iniziali su gradient pastello deterministico ──
// Il colore deriva dall'hash del cognome (sempre lo stesso ospite = stesso color).
const AVATAR_COLORS: Array<{ bg: string; text: string }> = [
  { bg: 'bg-primary-100', text: 'text-primary-700' },
  { bg: 'bg-violet-100',  text: 'text-violet-700'  },
  { bg: 'bg-pink-100',    text: 'text-pink-700'    },
  { bg: 'bg-teal-100',    text: 'text-teal-700'    },
  { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  { bg: 'bg-info-100',    text: 'text-info-700'    },
]

function GuestAvatar({ nome, cognome }: { nome: string; cognome: string }) {
  const initials = `${nome[0] ?? ''}${cognome[0] ?? ''}`.toUpperCase()
  const seed = (cognome || nome || '?').charCodeAt(0)
  const c = AVATAR_COLORS[seed % AVATAR_COLORS.length]
  return (
    <div className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold ${c.bg} ${c.text}`}>
      {initials || '?'}
    </div>
  )
}
