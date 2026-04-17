import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, startOfDay, endOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  LogIn, LogOut as LogOutIcon, Home, Users, Phone,
  Calendar, AlertCircle, CheckCircle2, MessageSquare,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { isHostAuthorized } from '@/lib/permissions'
import { getStrutturaAttivaId } from '@/lib/struttura-attiva'
import { VerificaCheckinButton } from './verifica-checkin-button'
// Badge imported if needed for future use

function notti(arrivo: Date, partenza: Date | null) {
  if (!partenza) return '—'
  return Math.round((partenza.getTime() - arrivo.getTime()) / 86400000)
}

export default async function OggiPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  const strutturaId = await getStrutturaAttivaId(hostId)
  const scope = strutturaId ? { hostId, strutturaId } : { hostId }

  const oggi = new Date()
  const inizioGiorno = startOfDay(oggi)
  const fineGiorno = endOfDay(oggi)

  const [arrivi, partenze, inCasa] = await Promise.all([
    prisma.prenotazione.findMany({
      where: {
        ...scope,
        dataArrivo: { gte: inizioGiorno, lte: fineGiorno },
        stato: { in: ['RICHIESTA', 'CONFERMATA'] },
      },
      include: {
        struttura: { select: { nome: true } },
        unita: { select: { nome: true } },
        pianoPasto: { select: { piano: true, note: true } },
        chat: { select: { id: true } },
      },
      orderBy: { dataArrivo: 'asc' },
    }),
    prisma.prenotazione.findMany({
      where: {
        ...scope,
        dataPartenza: { gte: inizioGiorno, lte: fineGiorno },
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      },
      include: {
        struttura: { select: { nome: true } },
        unita: { select: { nome: true } },
        addebiti: { select: { totale: true } },
      },
      orderBy: { dataPartenza: 'asc' },
    }),
    prisma.prenotazione.findMany({
      where: {
        ...scope,
        dataArrivo: { lt: inizioGiorno },
        dataPartenza: { gt: fineGiorno },
        stato: 'CONFERMATA',
      },
      include: {
        struttura: { select: { nome: true } },
        unita: { select: { nome: true } },
      },
      orderBy: { dataPartenza: 'asc' },
    }),
  ])

  const dataFormatted = format(oggi, "EEEE d MMMM yyyy", { locale: it })

  const PIANO_LABEL: Record<string, string> = {
    SOLO_PERNOTTAMENTO: 'RO',
    PERNOTTAMENTO_COLAZIONE: 'B&B',
    MEZZA_PENSIONE: 'HB',
    PENSIONE_COMPLETA: 'FB',
    ALL_INCLUSIVE: 'AI',
  }

  return (
    <div className="stack-lg">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] font-heading">Front Desk</h1>
          <p className="text-sm text-[var(--text-secondary)] capitalize mt-0.5">{dataFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="status" color="success" dot>{arrivi.length} arrivi</Badge>
          <Badge variant="status" color="warning" dot>{partenze.length} partenze</Badge>
          <Badge variant="status" color="info" dot>{inCasa.length} in casa</Badge>
        </div>
      </div>

      {/* ═══ ARRIVI ═══ */}
      <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--border-default)] border-l-4 border-l-emerald-500 overflow-hidden shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-default)]">
          <LogIn className="w-5 h-5 text-emerald-500" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Arrivi oggi</h2>
          <Badge variant="count" color="success" className="ml-auto">{arrivi.length}</Badge>
        </div>

        {arrivi.length === 0 ? (
          <div className="py-10 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-30" />
            <p className="text-sm text-[var(--text-secondary)]">Nessun arrivo previsto per oggi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-semibold">Ospite</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Camera</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Pax</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Notti</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Pasto</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Doc</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Reg Card</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Check-in</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Totale</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Note</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {arrivi.map(p => {
                  const n = notti(p.dataArrivo, p.dataPartenza)
                  const docOk = !!p.guestNumeroDocumento
                  const regOk = p.regCardFirmata
                  const piano = p.pianoPasto?.piano ? PIANO_LABEL[p.pianoPasto.piano] ?? '—' : '—'
                  const noteSpeciali = p.pianoPasto?.note || p.guestNote

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Ospite */}
                      <td className="px-4 py-3">
                        <Link href={`/host/prenotazioni/${p.id}`} className="hover:text-blue-600">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {p.guestNome[0]}{p.guestCognome[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">{p.guestNome} {p.guestCognome}</p>
                              <p className="text-[11px] text-slate-400">{p.guestEmail}</p>
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* Camera */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          <p className="font-medium text-slate-700 dark:text-slate-300">{p.unita?.nome ?? '—'}</p>
                          <p className="text-slate-400">{p.struttura?.nome}</p>
                        </div>
                      </td>

                      {/* Pax */}
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                          <Users className="w-3 h-3" /> {p.numOspiti}
                        </span>
                      </td>

                      {/* Notti */}
                      <td className="px-3 py-3 text-center text-xs font-medium text-slate-600">{n}</td>

                      {/* Piano pasto */}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          piano === 'FB' || piano === 'AI' ? 'bg-purple-100 text-purple-700' :
                          piano === 'HB' ? 'bg-blue-100 text-blue-700' :
                          piano === 'B&B' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {piano}
                        </span>
                      </td>

                      {/* Documento */}
                      <td className="px-3 py-3 text-center">
                        {docOk ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500 mx-auto" />
                        )}
                      </td>

                      {/* Reg Card */}
                      <td className="px-3 py-3 text-center">
                        {regOk ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500 mx-auto" />
                        )}
                      </td>

                      {/* Stato check-in */}
                      <td className="px-3 py-3 text-center">
                        <VerificaCheckinButton prenotazioneId={p.id} statoCheckIn={p.statoCheckIn} />
                      </td>

                      {/* Totale */}
                      <td className="px-3 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {p.prezzoTotale != null ? `€${p.prezzoTotale.toFixed(0)}` : '—'}
                      </td>

                      {/* Note */}
                      <td className="px-3 py-3 text-center">
                        {noteSpeciali ? (
                          <span className="inline-block max-w-[120px] truncate text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded" title={noteSpeciali}>
                            {noteSpeciali}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Azioni */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.guestTelefono && (
                            <a href={`tel:${p.guestTelefono}`} className="p-2 text-slate-400 hover:text-green-600 rounded" title="Chiama">
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {p.chat && (
                            <Link href={`/host/prenotazioni/${p.id}`} className="p-2 text-slate-400 hover:text-blue-600 rounded" title="Chat">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          <Link
                            href={`/host/prenotazioni/${p.id}`}
                            className="px-3 py-2 text-[11px] font-semibold bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Check-in →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ PARTENZE ═══ */}
      <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--border-default)] border-l-4 border-l-amber-500 overflow-hidden shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-default)]">
          <LogOutIcon className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Partenze oggi</h2>
          <Badge variant="count" color="warning" className="ml-auto">{partenze.length}</Badge>
        </div>

        {partenze.length === 0 ? (
          <div className="py-10 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-30" />
            <p className="text-sm text-[var(--text-secondary)]">Nessuna partenza prevista per oggi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-semibold">Ospite</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Camera</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Pax</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Notti</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Soggiorno</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Extra</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Totale</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {partenze.map(p => {
                  const n = notti(p.dataArrivo, p.dataPartenza)
                  const extraTotale = p.addebiti.reduce((s: number, a: { totale: number }) => s + a.totale, 0)
                  const totaleFinale = (p.prezzoTotale ?? 0) + (p.tassaSoggiorno ?? 0) + extraTotale

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/host/prenotazioni/${p.id}`} className="hover:text-blue-600">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {p.guestNome[0]}{p.guestCognome[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">{p.guestNome} {p.guestCognome}</p>
                              <p className="text-[11px] text-slate-400">{p.guestEmail}</p>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">{p.unita?.nome ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-xs">{p.numOspiti}</td>
                      <td className="px-3 py-3 text-center text-xs">{n}</td>
                      <td className="px-3 py-3 text-right text-xs">€{(p.prezzoTotale ?? 0).toFixed(0)}</td>
                      <td className="px-3 py-3 text-right text-xs">{extraTotale > 0 ? `€${extraTotale.toFixed(0)}` : '—'}</td>
                      <td className="px-3 py-3 text-right text-xs font-bold text-slate-900 dark:text-white">€{totaleFinale.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/host/prenotazioni/${p.id}`}
                          className="px-3 py-2 text-[11px] font-semibold bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                        >
                          Check-out →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ IN CASA ═══ */}
      <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--border-default)] border-l-4 border-l-blue-500 overflow-hidden shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-default)]">
          <Home className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Ospiti in casa</h2>
          <Badge variant="count" color="info" className="ml-auto">{inCasa.length}</Badge>
        </div>

        {inCasa.length === 0 ? (
          <div className="py-10 text-center">
            <Home className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-30" />
            <p className="text-sm text-[var(--text-secondary)]">Nessun ospite in casa</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {inCasa.map(p => {
              const partenzaStr = p.dataPartenza ? format(p.dataPartenza, 'd MMM', { locale: it }) : '—'
              return (
                <Link
                  key={p.id}
                  href={`/host/prenotazioni/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                    {p.guestNome[0]}{p.guestCognome[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{p.guestNome} {p.guestCognome}</p>
                    <p className="text-[11px] text-slate-400">
                      {p.unita?.nome ?? p.struttura?.nome ?? '—'} · {p.numOspiti} pax · parte {partenzaStr}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
