import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, startOfDay, endOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  LogIn, LogOut, Home, Users, Phone, Mail,
  Calendar, AlertCircle, CheckCircle2, Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

function notti(arrivo: Date, partenza: Date | null) {
  if (!partenza) return '—'
  const ms = partenza.getTime() - arrivo.getTime()
  return Math.round(ms / 86400000)
}

export default async function OggiPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const oggi = new Date()
  const inizioGiorno = startOfDay(oggi)
  const fineGiorno = endOfDay(oggi)

  const [arrivi, partenze, inCasa] = await Promise.all([
    // Arrivi oggi (dataArrivo = oggi, non ancora completati)
    prisma.prenotazione.findMany({
      where: {
        hostId: hostId,
        dataArrivo: { gte: inizioGiorno, lte: fineGiorno },
        stato: { in: ['RICHIESTA', 'CONFERMATA'] },
      },
      include: {
        struttura: { select: { nome: true } },
        unita: { select: { nome: true } },
      },
      orderBy: { dataArrivo: 'asc' },
    }),

    // Partenze oggi
    prisma.prenotazione.findMany({
      where: {
        hostId: hostId,
        dataPartenza: { gte: inizioGiorno, lte: fineGiorno },
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      },
      include: {
        struttura: { select: { nome: true } },
        unita: { select: { nome: true } },
      },
      orderBy: { dataPartenza: 'asc' },
    }),

    // Ospiti attualmente in casa (arrivati prima di oggi, partono dopo oggi)
    prisma.prenotazione.findMany({
      where: {
        hostId: hostId,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box">
        <div>
          <h1 className="page-title">Oggi</h1>
          <p className="text-sm text-gray-500 capitalize">{dataFormatted}</p>
        </div>
      </div>

      {/* Riepilogo KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded bg-green-50 flex items-center justify-center shrink-0">
            <LogIn className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{arrivi.length}</p>
            <p className="text-sm text-[#6c757d]">Arrivi</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded bg-[#ffbc00]/10 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5 text-[#ffbc00]" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{partenze.length}</p>
            <p className="text-sm text-[#6c757d]">Partenze</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded bg-brand-500/10 flex items-center justify-center shrink-0">
            <Home className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{inCasa.length}</p>
            <p className="text-sm text-[#6c757d]">In casa</p>
          </div>
        </div>
      </div>

      {/* Arrivi */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <LogIn className="w-5 h-5 text-green-600" />
          <h2 className="text-base font-semibold text-gray-800">Arrivi oggi</h2>
          <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded">
            {arrivi.length}
          </span>
        </div>

        {arrivi.length === 0 ? (
          <EmptyState messaggio="Nessun arrivo previsto per oggi" />
        ) : (
          <div className="divide-y divide-gray-100">
            {arrivi.map(p => (
              <RigaPrenotazione
                key={p.id}
                prenotazione={p}
                tipo="arrivo"
              />
            ))}
          </div>
        )}
      </div>

      {/* Partenze */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <LogOut className="w-5 h-5 text-[#ffbc00]" />
          <h2 className="text-base font-semibold text-gray-800">Partenze oggi</h2>
          <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded">
            {partenze.length}
          </span>
        </div>

        {partenze.length === 0 ? (
          <EmptyState messaggio="Nessuna partenza prevista per oggi" />
        ) : (
          <div className="divide-y divide-gray-100">
            {partenze.map(p => (
              <RigaPrenotazione
                key={p.id}
                prenotazione={p}
                tipo="partenza"
              />
            ))}
          </div>
        )}
      </div>

      {/* In casa */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-semibold text-gray-800">Ospiti in casa</h2>
          <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-brand-500/10 text-brand-500 rounded">
            {inCasa.length}
          </span>
        </div>

        {inCasa.length === 0 ? (
          <EmptyState messaggio="Nessun ospite presente in questo momento" />
        ) : (
          <div className="divide-y divide-gray-100">
            {inCasa.map(p => (
              <RigaPrenotazione
                key={p.id}
                prenotazione={p}
                tipo="in-casa"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componenti locali ────────────────────────────────────────────────────────

type PrenotazioneMini = {
  id: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  guestTelefono: string | null
  numOspiti: number
  dataArrivo: Date
  dataPartenza: Date | null
  stato: string
  prezzoTotale: number | null
  struttura: { nome: string } | null
  unita: { nome: string } | null
  guestNumeroDocumento: string | null
}

function RigaPrenotazione({
  prenotazione: p,
  tipo,
}: {
  prenotazione: PrenotazioneMini
  tipo: 'arrivo' | 'partenza' | 'in-casa'
}) {
  const nottiSoggiorno = p.dataPartenza
    ? Math.round((p.dataPartenza.getTime() - p.dataArrivo.getTime()) / 86400000)
    : null

  const documentoOk = !!p.guestNumeroDocumento
  const azioni: Record<typeof tipo, { label: string; stato: string; classes: string }[]> = {
    'arrivo': [
      { label: 'Check-in', stato: 'CONFERMATA', classes: 'bg-green-600 hover:bg-green-700 text-white' },
    ],
    'partenza': [
      { label: 'Check-out', stato: 'COMPLETATA', classes: 'bg-[#ffbc00] hover:bg-yellow-500 text-gray-900' },
    ],
    'in-casa': [],
  }

  return (
    <div className="py-3 flex items-center gap-4">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 font-bold text-sm flex items-center justify-center shrink-0 uppercase">
        {p.guestNome[0]}{p.guestCognome[0]}
      </div>

      {/* Info principale */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/host/prenotazioni/${p.id}`}
            className="font-semibold text-gray-900 text-sm hover:text-brand-500"
          >
            {p.guestNome} {p.guestCognome}
          </Link>
          {!documentoOk && tipo === 'arrivo' && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              <AlertCircle className="w-3 h-3" /> doc. mancante
            </span>
          )}
          {documentoOk && tipo === 'arrivo' && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {p.numOspiti} ospiti
          </span>
          {nottiSoggiorno !== null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {nottiSoggiorno} notti
            </span>
          )}
          {p.struttura && (
            <span>{p.struttura.nome}{p.unita ? ` · ${p.unita.nome}` : ''}</span>
          )}
          {p.prezzoTotale != null && (
            <span className="font-medium text-gray-700">€{p.prezzoTotale.toFixed(0)}</span>
          )}
        </div>
      </div>

      {/* Contatti + azioni */}
      <div className="flex items-center gap-2 shrink-0">
        {p.guestTelefono && (
          <a
            href={`tel:${p.guestTelefono}`}
            className="p-1.5 text-gray-400 hover:text-green-600 rounded"
            title={p.guestTelefono}
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
        <a
          href={`mailto:${p.guestEmail}`}
          className="p-1.5 text-gray-400 hover:text-brand-500 rounded"
          title={p.guestEmail}
        >
          <Mail className="w-4 h-4" />
        </a>
        <Link
          href={`/host/prenotazioni/${p.id}`}
          className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {tipo === 'arrivo' ? 'Check-in →' : tipo === 'partenza' ? 'Check-out →' : 'Dettagli'}
        </Link>
      </div>
    </div>
  )
}

function EmptyState({ messaggio }: { messaggio: string }) {
  return (
    <div className="py-8 flex flex-col items-center gap-2 text-gray-400">
      <Calendar className="w-8 h-8 opacity-30" />
      <p className="text-sm">{messaggio}</p>
    </div>
  )
}
