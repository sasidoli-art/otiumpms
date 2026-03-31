import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { formatData, formatValuta, pianoLabel, statoAbbonamentoLabel, statoAbbonamentoColor, statoPagamentoLabel, statoPagamentoColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Calendar, CreditCard } from 'lucide-react'

const BENEFICI: Record<string, string[]> = {
  EVENTO_SINGOLO: [
    'Evento in evidenza nella newsletter',
    'Badge "In Evidenza" sulla pagina',
    'Visibilità nella tua regione',
    'Durata: 1 settimana',
    'Statistiche di visualizzazione',
  ],
  VISIBILITA_MENSILE: [
    'Tutti i tuoi eventi in evidenza',
    'Posizione prioritaria nei risultati',
    'Banner nella newsletter settimanale',
    'Visibilità regionale o nazionale',
    'Statistiche dettagliate',
    'Supporto dedicato via email',
  ],
  PARTNER_PREMIUM: [
    'Tutto del piano Mensile',
    'Sezione dedicata in home page',
    'Pagina partner personalizzata',
    'Menzione nell\'editoriale AI',
    'Account manager dedicato',
    'Analytics avanzati con report PDF',
    'Priorità assoluta su tutte le pagine',
    'Logo nella newsletter',
  ],
}

export default async function HostAbbonamentoPage() {
  const session = await getServerSession(authOptions)
  const hostId = await getHostId()
  if (!session || !hostId) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    include: {
      abbonamenti: { orderBy: { createdAt: 'desc' }, take: 5 },
      pagamenti: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!host) redirect('/login')

  const benefici = BENEFICI[host.piano] || []

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Il mio abbonamento</h1>
        <p className="text-gray-500 text-sm mt-1">Gestisci il tuo piano e visualizza lo storico pagamenti</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Piano attuale */}
        <div className="xl:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Piano attuale</p>
                <h2 className="text-2xl font-bold text-gray-900">{pianoLabel(host.piano)}</h2>
              </div>
              <Badge className={statoAbbonamentoColor(host.statoAbbonamento)}>
                {statoAbbonamentoLabel(host.statoAbbonamento)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {host.dataInizioAbb && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <Calendar size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Data inizio</p>
                    <p className="text-sm font-medium">{formatData(host.dataInizioAbb)}</p>
                  </div>
                </div>
              )}
              {host.dataFineAbb && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <Calendar size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Scadenza</p>
                    <p className="text-sm font-medium">{formatData(host.dataFineAbb)}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Cosa include il tuo piano:</p>
              <ul className="space-y-2">
                {benefici.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Per modificare il piano o gestire il tuo abbonamento contatta il team Otium Week:
              </p>
              <a href="mailto:info@otiumweek.it" className="text-brand-600 hover:underline text-sm font-medium">
                info@otiumweek.it
              </a>
            </div>
          </div>
        </div>

        {/* Pagamenti recenti */}
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <CreditCard size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Pagamenti</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {host.pagamenti.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-gray-400">Nessun pagamento</p>
              ) : host.pagamenti.map(p => (
                <div key={p.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{formatValuta(p.importo)}</span>
                    <Badge className={statoPagamentoColor(p.stato)}>{statoPagamentoLabel(p.stato)}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.descrizione || p.metodo || '—'} · {formatData(p.dataScadenza || p.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
