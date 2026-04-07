import { redirect } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { SelezioneStrutturaClient } from './client'

export const dynamic = 'force-dynamic'

interface StrutturaCard {
  id: string
  nome: string
  citta: string | null
  logo: string | null
  kpi: {
    arriviOggi: number
    partenzeOggi: number
    occupatiOggi: number
    totaleUnita: number
    prenotazioniMese: number
    fatturatoMese: number
  }
}

export default async function SelezionaStrutturaPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const strutture = await prisma.struttura.findMany({
    where: { hostId },
    select: { id: true, nome: true, citta: true, logo: true },
    orderBy: { nome: 'asc' },
  })

  // Se 0 strutture, manda a creare la prima
  if (strutture.length === 0) {
    redirect('/host/strutture')
  }
  // Se 1 sola, l'utente non dovrebbe nemmeno arrivare qui — vai diretto
  if (strutture.length === 1) {
    redirect('/host/dashboard')
  }

  // Calcola KPI per ogni struttura
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const domani = new Date(oggi)
  domani.setDate(domani.getDate() + 1)
  const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1)

  const cards: StrutturaCard[] = await Promise.all(
    strutture.map(async (s) => {
      const [arriviOggi, partenzeOggi, occupatiOggi, totaleUnita, prenMese] = await Promise.all([
        prisma.prenotazione.count({
          where: { strutturaId: s.id, dataArrivo: { gte: oggi, lt: domani } },
        }),
        prisma.prenotazione.count({
          where: { strutturaId: s.id, dataPartenza: { gte: oggi, lt: domani } },
        }),
        prisma.prenotazione.count({
          where: {
            strutturaId: s.id,
            dataArrivo: { lte: oggi },
            dataPartenza: { gt: oggi },
          },
        }),
        prisma.unitaPrenotabile.count({ where: { strutturaId: s.id, attiva: true } }),
        prisma.prenotazione.findMany({
          where: { strutturaId: s.id, createdAt: { gte: inizioMese } },
          select: { prezzoTotale: true },
        }),
      ])
      const fatturatoMese = prenMese.reduce((sum, p) => sum + Number(p.prezzoTotale ?? 0), 0)
      return {
        id: s.id,
        nome: s.nome,
        citta: s.citta,
        logo: s.logo,
        kpi: {
          arriviOggi,
          partenzeOggi,
          occupatiOggi,
          totaleUnita,
          prenotazioniMese: prenMese.length,
          fatturatoMese,
        },
      }
    })
  )

  // Riepilogo aggregato
  const totali = cards.reduce(
    (acc, c) => ({
      arrivi: acc.arrivi + c.kpi.arriviOggi,
      partenze: acc.partenze + c.kpi.partenzeOggi,
      occupati: acc.occupati + c.kpi.occupatiOggi,
      unita: acc.unita + c.kpi.totaleUnita,
      prenotazioni: acc.prenotazioni + c.kpi.prenotazioniMese,
      fatturato: acc.fatturato + c.kpi.fatturatoMese,
    }),
    { arrivi: 0, partenze: 0, occupati: 0, unita: 0, prenotazioni: 0, fatturato: 0 }
  )

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Le tue strutture</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Seleziona una struttura per accedere al gestionale
              </p>
            </div>
          </div>
        </div>

        {/* Riepilogo aggregato */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Riepilogo generale ({cards.length} strutture)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <KpiCell label="Arrivi oggi" value={totali.arrivi} />
            <KpiCell label="Partenze oggi" value={totali.partenze} />
            <KpiCell label="Occupate ora" value={totali.occupati} />
            <KpiCell label="Unità totali" value={totali.unita} />
            <KpiCell label="Prenotazioni mese" value={totali.prenotazioni} />
            <KpiCell label="Fatturato mese" value={`€ ${totali.fatturato.toFixed(0)}`} />
          </div>
        </div>

        {/* Cards strutture */}
        <SelezioneStrutturaClient cards={cards} />
      </div>
    </div>
  )
}

function KpiCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
