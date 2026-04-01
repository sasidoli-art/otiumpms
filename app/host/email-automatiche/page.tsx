import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Mail, Clock, CheckCircle2, XCircle, Send, CalendarCheck, Star, Sparkles } from 'lucide-react'
import EmailTriggerButton from './email-trigger-button'
import { getTranslations } from 'next-intl/server'

export default async function EmailAutomatichePage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const now = new Date()
  const domani = new Date(now)
  domani.setDate(domani.getDate() + 1)
  domani.setHours(0, 0, 0, 0)
  const dopodomani = new Date(domani)
  dopodomani.setDate(dopodomani.getDate() + 1)
  const ieri = new Date(now)
  ieri.setDate(ieri.getDate() - 1)
  ieri.setHours(0, 0, 0, 0)
  const oggi = new Date(now)
  oggi.setHours(0, 0, 0, 0)

  // Contatori per la dashboard
  const [
    reminderDaInviare,
    reminderInviati,
    followUpDaInviare,
    followUpInviati,
    spaReminderDaInviare,
    spaReminderInviati,
    ultimiInvii,
  ] = await Promise.all([
    // Reminder pre-arrivo: arrivi domani non ancora inviati
    prisma.prenotazione.count({
      where: { hostId, stato: 'CONFERMATA', dataArrivo: { gte: domani, lt: dopodomani }, reminderInviato: false, guestEmail: { not: '' } },
    }),
    // Reminder già inviati (ultimi 30gg)
    prisma.prenotazione.count({
      where: { hostId, reminderInviato: true, updatedAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
    }),
    // Follow-up: partenze ieri non ancora inviati
    prisma.prenotazione.count({
      where: { hostId, stato: 'COMPLETATA', dataPartenza: { gte: ieri, lt: oggi }, followUpInviato: false, guestEmail: { not: '' } },
    }),
    // Follow-up già inviati (ultimi 30gg)
    prisma.prenotazione.count({
      where: { hostId, followUpInviato: true, updatedAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
    }),
    // SPA reminder: appuntamenti domani non inviati
    prisma.appuntamentoSpa.count({
      where: { hostId, stato: { in: ['CONFERMATO', 'PRENOTATO'] }, dataOra: { gte: domani, lt: dopodomani }, reminderInviato: false, guestEmail: { not: null } },
    }),
    // SPA reminder già inviati (ultimi 30gg)
    prisma.appuntamentoSpa.count({
      where: { hostId, reminderInviato: true, updatedAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
    }),
    // Ultimi invii (prenotazioni con reminder o followup inviato)
    prisma.prenotazione.findMany({
      where: {
        hostId,
        OR: [{ reminderInviato: true }, { followUpInviato: true }],
      },
      select: {
        id: true,
        guestNome: true,
        guestCognome: true,
        guestEmail: true,
        dataArrivo: true,
        dataPartenza: true,
        reminderInviato: true,
        followUpInviato: true,
        updatedAt: true,
        struttura: { select: { nome: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ])

  const t = await getTranslations('host.emailAuto')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <EmailTriggerButton />
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <CalendarCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('preArrival')}</p>
              <p className="text-xs text-gray-400">{t('tomorrowArrivals')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold text-blue-600">{reminderDaInviare}</p>
              <p className="text-xs text-gray-400">{t('toSend')}</p>
            </div>
            <div className="border-l border-gray-100 pl-4">
              <p className="text-lg font-semibold text-gray-600">{reminderInviati}</p>
              <p className="text-xs text-gray-400">{t('sent30d')}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('postStay')}</p>
              <p className="text-xs text-gray-400">{t('yesterdayDepartures')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold text-amber-600">{followUpDaInviare}</p>
              <p className="text-xs text-gray-400">{t('toSend')}</p>
            </div>
            <div className="border-l border-gray-100 pl-4">
              <p className="text-lg font-semibold text-gray-600">{followUpInviati}</p>
              <p className="text-xs text-gray-400">{t('sent30d')}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('spaReminder')}</p>
              <p className="text-xs text-gray-400">{t('tomorrowAppointments')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold text-purple-600">{spaReminderDaInviare}</p>
              <p className="text-xs text-gray-400">{t('toSend')}</p>
            </div>
            <div className="border-l border-gray-100 pl-4">
              <p className="text-lg font-semibold text-gray-600">{spaReminderInviati}</p>
              <p className="text-xs text-gray-400">{t('sent30d')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="card bg-indigo-50 border border-indigo-100">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-900">{t('howItWorks')}</p>
            <ul className="text-sm text-indigo-700 mt-1 space-y-1">
              <li>{t('preArrivalDesc')}</li>
              <li>{t('postStayDesc')}</li>
              <li>{t('spaReminderDesc')}</li>
            </ul>
            <p className="text-xs text-indigo-500 mt-2">
              {t('cronNote')}
            </p>
          </div>
        </div>
      </div>

      {/* Storico ultimi invii */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('recentSent')}</h2>
        {ultimiInvii.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">{t('noEmailSent')}</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {ultimiInvii.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {p.guestNome} {p.guestCognome}
                    <span className="text-gray-400 text-xs ml-2">{p.guestEmail}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.reminderInviato && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t('reminder')}</span>
                    )}
                    {p.followUpInviato && (
                      <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{t('followUp')}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {p.struttura?.nome} · {format(new Date(p.updatedAt), 'd MMM HH:mm', { locale: it })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
