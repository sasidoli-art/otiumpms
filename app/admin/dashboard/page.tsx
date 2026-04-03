import { prisma } from '@/lib/db'
import { StatCard } from '@/components/ui/stat-card'
import { formatValuta, formatData, pianoLabel, statoAbbonamentoLabel, statoAbbonamentoColor, statoEventoLabel, statoEventoColor } from '@/lib/utils'
import { Users, CalendarDays, CreditCard, FileText, TrendingUp, Clock, Building2, BedDouble } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { RevenueChart, PrenotazioniChart, StatoPrenotazioniChart, TopHostChart } from './dashboard-charts'
import { getTranslations } from 'next-intl/server'

export default async function AdminDashboardPage() {
  const t = await getTranslations('admin.dashboard')
  const tc = await getTranslations('common')
  const now = new Date()

  const MESI = [
    t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'),
    t('months.may'), t('months.jun'), t('months.jul'), t('months.aug'),
    t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec'),
  ]

  const [
    totaleClienti,
    clientiAttivi,
    totaleFatture,
    fattureInAttesa,
    eventiInAttesa,
    eventiRecenti,
    ultimiClienti,
    fattureTotaleImporto,
    totalePrenotazioni,
    totaleStrutture,
    totaleUnita,
    // Stato prenotazioni
    prenotazioniPerStato,
    // Top hosts
    topHosts,
  ] = await Promise.all([
    prisma.host.count(),
    prisma.host.count({ where: { statoAbbonamento: 'ATTIVO' } }),
    prisma.fattura.count(),
    prisma.fattura.count({ where: { stato: { in: ['INVIATA', 'BOZZA'] } } }),
    prisma.evento.count({ where: { stato: 'IN_ATTESA' } }),
    prisma.evento.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { host: { select: { nomeAzienda: true } } },
    }),
    prisma.host.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { nome: true, cognome: true } } },
    }),
    prisma.fattura.aggregate({
      _sum: { totale: true },
      where: { stato: 'PAGATA' },
    }),
    prisma.prenotazione.count(),
    prisma.struttura.count({ where: { attiva: true } }),
    prisma.unitaPrenotabile.count({ where: { attiva: true } }),
    // Stato breakdown
    prisma.prenotazione.groupBy({
      by: ['stato'],
      _count: true,
    }),
    // Top hosts by bookings
    prisma.host.findMany({
      take: 5,
      include: {
        _count: { select: { prenotazioni: true } },
      },
      orderBy: { prenotazioni: { _count: 'desc' } },
    }),
  ])

  // ── Monthly revenue & bookings (last 6 months) ──────────────
  const mesiData = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const inizio = new Date(d.getFullYear(), d.getMonth(), 1)
      const fine = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      return Promise.all([
        prisma.fattura.aggregate({
          _sum: { totale: true },
          where: { stato: 'PAGATA', dataEmissione: { gte: inizio, lt: fine } },
        }),
        prisma.prenotazione.count({
          where: { createdAt: { gte: inizio, lt: fine } },
        }),
      ]).then(([agg, count]) => ({
        mese: `${MESI[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        fatturato: Number(agg._sum.totale ?? 0),
        prenotazioni: count,
      }))
    })
  )

  // ── Stato prenotazioni for pie chart ────────────────────────
  const statoMap: Record<string, string> = {
    CONFERMATA: 'Confermate',
    RICHIESTA: 'Richieste',
    COMPLETATA: 'Completate',
    ANNULLATA: 'Annullate',
    NO_SHOW: 'No Show',
  }
  const statoData = prenotazioniPerStato.map(s => ({
    nome: statoMap[s.stato] ?? s.stato,
    valore: s._count,
  }))

  // ── Top host data ───────────────────────────────────────────
  const topHostData = topHosts
    .filter(h => h._count.prenotazioni > 0)
    .map(h => ({
      nome: h.nomeAzienda.length > 20 ? h.nomeAzienda.slice(0, 18) + '…' : h.nomeAzienda,
      prenotazioni: h._count.prenotazioni,
      fatturato: 0,
    }))

  const fatturato = fattureTotaleImporto._sum.totale ?? 0

  // ── Month-over-month trend ──────────────────────────────────
  const meseCorrente = mesiData[5]?.fatturato ?? 0
  const mesePrecedente = mesiData[4]?.fatturato ?? 0
  const trendFatturato = mesePrecedente > 0
    ? Math.round(((meseCorrente - mesePrecedente) / mesePrecedente) * 100)
    : 0

  const prenotazioniMeseCorrente = mesiData[5]?.prenotazioni ?? 0
  const prenotazioniMesePrecedente = mesiData[4]?.prenotazioni ?? 0
  const trendPrenotazioni = prenotazioniMesePrecedente > 0
    ? Math.round(((prenotazioniMeseCorrente - prenotazioniMesePrecedente) / prenotazioniMesePrecedente) * 100)
    : 0

  return (
    <div>
      {/* Page Title */}
      <div className="page-title-box">
        <h4 className="page-title">Dashboard</h4>
        <p className="text-sm text-[#6c757d] mt-0.5">Panoramica generale della piattaforma</p>{/* TODO: i18n */}
      </div>

      {/* Stat Cards — row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <StatCard
          titolo="Clienti totali"
          valore={totaleClienti}
          sotto={`${clientiAttivi} abbonamenti attivi`}
          icona={<Users size={24} />}
          colorIcona="text-brand-500"
        />
        <StatCard
          titolo="Fatturato totale"
          valore={formatValuta(fatturato)}
          sotto="Fatture pagate"
          icona={<TrendingUp size={24} />}
          colorIcona="text-[#0acf97]"
          trend={trendFatturato !== 0 ? { valore: trendFatturato, etichetta: 'vs mese prec.' } : undefined}
        />
        <StatCard
          titolo="Fatture in sospeso"
          valore={fattureInAttesa}
          sotto="Da inviare o in attesa"
          icona={<FileText size={24} />}
          colorIcona="text-[#ffbc00]"
        />
        <StatCard
          titolo="Eventi da approvare"
          valore={eventiInAttesa}
          sotto="In attesa di revisione"
          icona={<Clock size={24} />}
          colorIcona="text-[#fa5c7c]"
        />
      </div>

      {/* Stat Cards — row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <StatCard
          titolo="Prenotazioni totali"
          valore={totalePrenotazioni}
          sotto={`${prenotazioniMeseCorrente} questo mese`}
          icona={<CalendarDays size={24} />}
          colorIcona="text-brand-500"
          trend={trendPrenotazioni !== 0 ? { valore: trendPrenotazioni, etichetta: 'vs mese prec.' } : undefined}
        />
        <StatCard
          titolo="Strutture attive"
          valore={totaleStrutture}
          sotto={`${totaleUnita} unità prenotabili`}
          icona={<Building2 size={24} />}
          colorIcona="text-[#6366f1]"
        />
        <StatCard
          titolo="Tasso occupazione"
          valore={totalePrenotazioni > 0 && totaleUnita > 0
            ? `${Math.round((prenotazioniMeseCorrente / (totaleUnita * 30)) * 100)}%`
            : '—'}
          sotto="Stima mese corrente"
          icona={<BedDouble size={24} />}
          colorIcona="text-[#0acf97]"
        />
        <StatCard
          titolo="Fatturato mese"
          valore={formatValuta(meseCorrente)}
          sotto={MESI[now.getMonth()] + ' ' + now.getFullYear()}
          icona={<CreditCard size={24} />}
          colorIcona="text-[#ffbc00]"
        />
      </div>

      {/* Charts — row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <RevenueChart data={mesiData} />
        <PrenotazioniChart data={mesiData} />
      </div>

      {/* Charts — row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <StatoPrenotazioniChart data={statoData} />
        <TopHostChart data={topHostData} />
      </div>

      {/* Tables — ultimi eventi + clienti */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Ultimi eventi */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-900">Ultimi eventi inseriti</h2>{/* TODO: i18n */}
            </div>
            <Link href="/admin/eventi" className="text-sm text-brand-500 hover:text-brand-600 font-semibold">
              Vedi tutti →{/* TODO: i18n */}
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {eventiRecenti.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Nessun evento ancora</p>
            ) : (
              eventiRecenti.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/admin/eventi/${ev.id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ev.titolo}</p>
                    <p className="text-xs text-gray-400">{ev.host.nomeAzienda} · {ev.citta}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{formatData(ev.dataInizio)}</span>
                    <Badge className={statoEventoColor(ev.stato)}>{statoEventoLabel(ev.stato)}</Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Ultimi clienti */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-900">Ultimi clienti registrati</h2>{/* TODO: i18n */}
            </div>
            <Link href="/admin/clienti" className="text-sm text-brand-500 hover:text-brand-600 font-semibold">
              Vedi tutti →{/* TODO: i18n */}
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {ultimiClienti.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Nessun cliente ancora</p>
            ) : (
              ultimiClienti.map((host) => (
                <Link
                  key={host.id}
                  href={`/admin/clienti/${host.id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-sm shrink-0">
                    {host.nomeAzienda.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{host.nomeAzienda}</p>
                    <p className="text-xs text-gray-400">{host.user.nome} {host.user.cognome}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-gray-100 text-gray-600 text-xs">{pianoLabel(host.piano)}</Badge>
                    <Badge className={statoAbbonamentoColor(host.statoAbbonamento)}>
                      {statoAbbonamentoLabel(host.statoAbbonamento)}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
