import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/ui/stat-card'
import { formatData, formatValuta, statoAbbonamentoLabel, statoAbbonamentoColor, pianoLabel, statoEventoLabel, statoEventoColor, statoFatturaLabel, statoFatturaColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Eye, MousePointerClick, CreditCard, ArrowDownToLine, ArrowUpFromLine, BedDouble, Euro, Waves } from 'lucide-react'
import Link from 'next/link'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, eachDayOfInterval, addDays } from 'date-fns'
import { format } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'
import OccupancyChart from './occupancy-chart'
import { isHostAuthorized } from '@/lib/permissions'
import { getStrutturaAttivaId } from '@/lib/struttura-attiva'
import { isModuloAttivo } from '@/lib/moduli'

export default async function HostDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  const strutturaId = await getStrutturaAttivaId(hostId)
  const scope = strutturaId ? { hostId, strutturaId } : { hostId }

  const oggi = new Date()
  const inizioGiorno = startOfDay(oggi)
  const fineGiorno = endOfDay(oggi)
  const inizioMese = startOfMonth(oggi)
  const fineMese = endOfMonth(oggi)

  const [host, eventiRecenti, fattureRecenti, totaliEventi, arriviOggi, partenzeOggi, inCasaOggi, revenueMese, prenotazioniRecenti, spaOggi, spaRevenueMese] = await Promise.all([
    prisma.host.findUnique({
      where: { id: hostId },
      select: { nomeAzienda: true, piano: true, statoAbbonamento: true, dataFineAbb: true, moduliAttivi: true },
    }),
    prisma.evento.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.fattura.findMany({
      where: { hostId },
      orderBy: { dataEmissione: 'desc' },
      take: 5,
    }),
    prisma.evento.aggregate({
      where: { hostId },
      _sum: { visualizzazioni: true, click: true },
      _count: true,
    }),
    prisma.prenotazione.count({
      where: { ...scope, dataArrivo: { gte: inizioGiorno, lte: fineGiorno }, stato: { in: ['CONFERMATA', 'COMPLETATA'] } },
    }),
    prisma.prenotazione.count({
      where: { ...scope, dataPartenza: { gte: inizioGiorno, lte: fineGiorno }, stato: { in: ['CONFERMATA', 'COMPLETATA'] } },
    }),
    prisma.prenotazione.count({
      where: { ...scope, dataArrivo: { lte: fineGiorno }, dataPartenza: { gte: inizioGiorno }, stato: { in: ['CONFERMATA'] } },
    }),
    prisma.prenotazione.aggregate({
      where: { ...scope, dataArrivo: { gte: inizioMese, lte: fineMese }, stato: { in: ['CONFERMATA', 'COMPLETATA'] } },
      _sum: { prezzoTotale: true },
    }),
    prisma.prenotazione.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        struttura: { select: { nome: true } },
        unita: { select: { nome: true } },
      },
    }),
    prisma.appuntamentoSpa.count({
      where: { hostId, dataOra: { gte: inizioGiorno, lte: fineGiorno }, stato: { notIn: ['ANNULLATO', 'NO_SHOW'] } },
    }),
    prisma.appuntamentoSpa.aggregate({
      where: { hostId, dataOra: { gte: inizioMese, lte: fineMese }, stato: 'COMPLETATO' },
      _sum: { prezzoTotale: true },
    }),
  ])

  if (!host) redirect('/login')

  // ─── Occupancy last 30 days ──────────────────────────────────────────────
  const totalUnita = await prisma.unitaPrenotabile.count({
    where: {
      struttura: { hostId, attiva: true, ...(strutturaId && { id: strutturaId }) },
      attiva: true,
    },
  })

  const last30 = eachDayOfInterval({ start: subDays(oggi, 29), end: oggi })
  const prenotazioniRange = totalUnita > 0
    ? await prisma.prenotazione.findMany({
        where: {
          ...scope,
          stato: { in: ['CONFERMATA', 'COMPLETATA'] },
          dataArrivo: { lte: oggi },
          OR: [
            { dataPartenza: { gte: subDays(oggi, 29) } },
            { dataPartenza: null },
          ],
        },
        select: { dataArrivo: true, dataPartenza: true },
      })
    : []

  const occupancyData = last30.map(day => {
    const occupied = prenotazioniRange.filter(p => {
      const a = startOfDay(new Date(p.dataArrivo))
      const z = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : addDays(a, 1)
      return day >= a && day < z
    }).length
    return {
      data: format(day, 'yyyy-MM-dd'),
      label: format(day, 'd MMM', { locale: itLocale }),
      occupazione: totalUnita > 0 ? Math.round((occupied / totalUnita) * 100) : 0,
    }
  })

  const totalViews = totaliEventi._sum.visualizzazioni ?? 0
  const totalClick = totaliEventi._sum.click ?? 0
  const revenueMeseVal = revenueMese._sum.prezzoTotale ?? 0
  const spaRevenueMeseVal = spaRevenueMese._sum.prezzoTotale ?? 0

  return (
    <div className="animate-fadeIn space-y-8">
      {/* Page Title */}
      <div className="page-title-box">
        <h4 className="page-title">
          Benvenuto, <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">{session.user.name.split(' ')[0]}</span>!
        </h4>
        <p className="text-sm text-[#6c757d] mt-0.5">
          {host.nomeAzienda} &middot; Oggi: {arriviOggi} arriv{arriviOggi === 1 ? 'o' : 'i'}, {partenzeOggi} partenz{partenzeOggi === 1 ? 'a' : 'e'}
        </p>
      </div>

      {/* Banner abbonamento */}
      <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-white/20 text-white">{pianoLabel(host.piano)}</Badge>
            <Badge className={statoAbbonamentoColor(host.statoAbbonamento)}>
              {statoAbbonamentoLabel(host.statoAbbonamento)}
            </Badge>
          </div>
          {host.dataFineAbb && (
            <p className="text-white/70 text-sm">
              Abbonamento attivo fino al {formatData(host.dataFineAbb)}
            </p>
          )}
        </div>
        <Link href="/host/abbonamento" className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap">
          Gestisci →
        </Link>
      </div>

      {/* PMS KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="border-t-2 border-[#0acf97] rounded-xl">
          <StatCard
            titolo="Arrivi oggi"
            valore={arriviOggi}
            icona={<ArrowDownToLine size={24} />}
            colorIcona="text-[#0acf97]"
            trend={{ valore: 12, etichetta: 'vs sett. scorsa' }}
          />
        </div>
        <div className="border-t-2 border-[#fa5c7c] rounded-xl">
          <StatCard
            titolo="Partenze oggi"
            valore={partenzeOggi}
            icona={<ArrowUpFromLine size={24} />}
            colorIcona="text-[#fa5c7c]"
            trend={{ valore: -5, etichetta: 'vs sett. scorsa' }}
          />
        </div>
        <div className="border-t-2 border-blue-500 rounded-xl">
          <StatCard
            titolo="Ospiti in casa"
            valore={inCasaOggi}
            icona={<BedDouble size={24} />}
            colorIcona="text-brand-500"
            trend={{ valore: 8, etichetta: 'vs sett. scorsa' }}
          />
        </div>
        <div className="border-t-2 border-[#39afd1] rounded-xl">
          <StatCard
            titolo="Revenue mese"
            valore={formatValuta(revenueMeseVal)}
            icona={<Euro size={24} />}
            colorIcona="text-[#39afd1]"
            trend={{ valore: 15, etichetta: 'vs mese prec.' }}
          />
        </div>
      </div>

      {/* SPA quick-access — solo se il modulo SPA è attivo per questo host */}
      {isModuloAttivo(host?.moduliAttivi, 'spa') && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <Waves size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-violet-900 text-sm">Modulo SPA &amp; Benessere</p>
              <p className="text-xs text-violet-600 mt-0.5">
                {spaOggi} appuntament{spaOggi === 1 ? 'o' : 'i'} oggi
                {spaRevenueMeseVal > 0 && ` · €${spaRevenueMeseVal.toFixed(0)} revenue mese`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/host/spa/appuntamenti" className="text-xs font-medium text-violet-700 border border-violet-300 bg-white hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors">
              Appuntamenti
            </Link>
            <Link href="/host/spa" className="text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition-colors">
              Dashboard SPA →
            </Link>
          </div>
        </div>
      )}

      {/* Stats eventi — solo se modulo eventi attivo */}
      {isModuloAttivo(host?.moduliAttivi, 'eventi') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard
            titolo="I miei eventi"
            valore={totaliEventi._count}
            icona={<CalendarDays size={24} />}
            colorIcona="text-brand-500"
          />
          <StatCard
            titolo="Visualizzazioni totali"
            valore={totalViews.toLocaleString('it-IT')}
            icona={<Eye size={24} />}
            colorIcona="text-[#39afd1]"
          />
          <StatCard
            titolo="Click totali"
            valore={totalClick.toLocaleString('it-IT')}
            sotto={totalViews > 0 ? `CTR ${Math.round((totalClick / totalViews) * 100)}%` : undefined}
            icona={<MousePointerClick size={24} />}
            colorIcona="text-[#0acf97]"
          />
        </div>
      )}

      {/* Occupancy chart */}
      {totalUnita > 0 && (
        <div>
          <OccupancyChart dati={occupancyData} />
        </div>
      )}

      {/* Tre colonne */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Prenotazioni recenti */}
        <div className="card xl:col-span-1">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Prenotazioni recenti</h2>
            <Link href="/host/prenotazioni" className="text-sm text-brand-500 hover:text-brand-600 font-semibold transition-colors">Vedi tutte &rarr;</Link>
          </div>
          <div>
            {prenotazioniRecenti.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-400 mb-3">Nessuna prenotazione ancora</p>
                <Link href="/host/prenotazioni/nuova" className="btn-primary text-sm">Aggiungi prenotazione</Link>
              </div>
            ) : prenotazioniRecenti.map((p, idx) => (
              <Link key={p.id} href={`/host/prenotazioni/${p.id}`} className={`flex items-center gap-3 px-6 py-3.5 hover:bg-blue-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.guestNome} {p.guestCognome}</p>
                  <p className="text-xs text-gray-400">
                    {p.struttura?.nome ?? '—'} &middot; {format(new Date(p.dataArrivo), 'd MMM', { locale: itLocale })}
                    {p.dataPartenza && ` \u2192 ${format(new Date(p.dataPartenza), 'd MMM', { locale: itLocale })}`}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  p.stato === 'CONFERMATA' ? 'bg-green-100 text-green-700' :
                  p.stato === 'ANNULLATA' ? 'bg-red-100 text-red-700' :
                  p.stato === 'COMPLETATA' ? 'bg-blue-100 text-blue-700' :
                  p.stato === 'RICHIESTA' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {p.stato === 'CONFERMATA' ? 'Conf.' :
                   p.stato === 'ANNULLATA' ? 'Ann.' :
                   p.stato === 'COMPLETATA' ? 'Comp.' :
                   p.stato === 'RICHIESTA' ? 'Attesa' : p.stato}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Ultimi eventi — solo se modulo eventi attivo */}
        {isModuloAttivo(host?.moduliAttivi, 'eventi') && (
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">I miei eventi</h2>
              <Link href="/host/eventi" className="text-sm text-brand-500 hover:text-brand-600 font-semibold">Vedi tutti →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {eventiRecenti.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-gray-400 mb-3">Non hai ancora inserito eventi</p>
                  <Link href="/host/eventi/nuovo" className="btn-primary text-sm">Inserisci il primo evento</Link>
                </div>
              ) : eventiRecenti.map(ev => (
                <Link key={ev.id} href={`/host/eventi/${ev.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ev.titolo}</p>
                    <p className="text-xs text-gray-400">{ev.citta} · {formatData(ev.dataInizio)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs text-gray-400">
                      <p>{ev.visualizzazioni} views</p>
                      <p>{ev.click} click</p>
                    </div>
                    <Badge className={statoEventoColor(ev.stato)}>{statoEventoLabel(ev.stato)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Ultime fatture — solo se modulo fatturazione attivo */}
        {isModuloAttivo(host?.moduliAttivi, 'fatturazione') && (
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Le mie fatture</h2>
              <Link href="/host/fatture" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Vedi tutte →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {fattureRecenti.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-400">Nessuna fattura ancora</p>
              ) : fattureRecenti.map(f => (
                <Link key={f.id} href={`/host/fatture/${f.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <CreditCard size={16} className="text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium text-gray-900">{f.numero}</p>
                    <p className="text-xs text-gray-400">{formatData(f.dataEmissione)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatValuta(f.totale)}</span>
                    <Badge className={statoFatturaColor(f.stato)}>{statoFatturaLabel(f.stato)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

