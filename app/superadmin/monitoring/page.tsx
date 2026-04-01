import { prisma } from '@/lib/db'
import { subHours, subDays } from 'date-fns'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Activity, Database, Users, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export const metadata = { title: 'Monitoring — SuperAdmin' }

export default async function MonitoringPage() {
  const tc = await getTranslations('common')
  const now = new Date()
  const ora1 = subHours(now, 1)
  const gg1 = subDays(now, 1)
  const gg7 = subDays(now, 7)

  const [
    prenotazioniUltimaOra, prenotazioniUltimoGiorno, prenotazioniSettimana,
    utentiAttivi, erroriAudit, ultimiAudit,
    totalePrenotazioni, totaleHost, totaleStrutture,
  ] = await Promise.all([
    prisma.prenotazione.count({ where: { createdAt: { gte: ora1 } } }),
    prisma.prenotazione.count({ where: { createdAt: { gte: gg1 } } }),
    prisma.prenotazione.count({ where: { createdAt: { gte: gg7 } } }),
    prisma.user.count({ where: { attivo: true } }),
    prisma.auditLog.count({ where: { azione: { contains: 'error' }, createdAt: { gte: gg1 } } }),
    prisma.auditLog.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.prenotazione.count(),
    prisma.host.count(),
    prisma.struttura.count(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-6 h-6 text-green-500" /> Monitoring
        </h1>
        <p className="text-sm text-gray-500">Stato sistema e attività in tempo reale</p>{/* TODO: i18n */}
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-sm font-bold text-green-600">{tc('online')}</p>
            <p className="text-xs text-gray-500">Database</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Database className="w-8 h-8 text-brand-500" />
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{totalePrenotazioni}</p>
            <p className="text-xs text-gray-500">Prenotazioni totali</p>{/* TODO: i18n */}
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-500" />
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{utentiAttivi}</p>
            <p className="text-xs text-gray-500">Utenti attivi</p>{/* TODO: i18n */}
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <AlertTriangle className={`w-8 h-8 ${erroriAudit > 0 ? 'text-red-500' : 'text-gray-300'}`} />
          <div>
            <p className={`text-xl font-bold ${erroriAudit > 0 ? 'text-red-600' : 'text-gray-400'}`}>{erroriAudit}</p>
            <p className="text-xs text-gray-500">Errori 24h</p>{/* TODO: i18n */}
          </div>
        </div>
      </div>

      {/* Traffico */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Traffico prenotazioni</h2>{/* TODO: i18n */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-extrabold text-brand-600">{prenotazioniUltimaOra}</p>
            <p className="text-xs text-gray-500">Ultima ora</p>{/* TODO: i18n */}
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-extrabold text-brand-600">{prenotazioniUltimoGiorno}</p>
            <p className="text-xs text-gray-500">Ultime 24h</p>{/* TODO: i18n */}
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-extrabold text-brand-600">{prenotazioniSettimana}</p>
            <p className="text-xs text-gray-500">Ultimi 7 giorni</p>{/* TODO: i18n */}
          </div>
        </div>
      </div>

      {/* Ultimo audit */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Ultime attività</h2>{/* TODO: i18n */}
        <div className="space-y-2">
          {ultimiAudit.map(l => (
            <div key={l.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-50 dark:border-slate-800">
              <Clock className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="font-medium text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded">{l.azione}</span>
              <span className="text-gray-500 flex-1 truncate">{l.dettagli || l.entita}</span>
              <span className="text-gray-400 shrink-0">{format(new Date(l.createdAt), 'HH:mm:ss', { locale: it })}</span>
            </div>
          ))}
          {ultimiAudit.length === 0 && <p className="text-sm text-gray-400 italic">Nessuna attività registrata</p>}{/* TODO: i18n */}
        </div>
      </div>
    </div>
  )
}
