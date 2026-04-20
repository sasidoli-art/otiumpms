import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { CheckCircle2, CalendarCheck, Mail, Sparkles } from 'lucide-react'
import EmailConfig from '@/components/email/email-config'
import EmailTriggerButton from './email-trigger-button'
import { isHostAuthorized } from '@/lib/permissions'

export default async function EmailAutomatichePage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const now = new Date()
  const trenta = new Date(now.getTime() - 30 * 86400000)

  const [preCheckinInviati, reminderInviati, followUpInviati, spaReminderInviati, ultimiInvii] = await Promise.all([
    prisma.prenotazione.count({ where: { hostId, reminderInviato: true, updatedAt: { gte: trenta } } }),
    prisma.prenotazione.count({ where: { hostId, reminderArrivoInviato: true, updatedAt: { gte: trenta } } }),
    prisma.prenotazione.count({ where: { hostId, followUpInviato: true, updatedAt: { gte: trenta } } }),
    prisma.appuntamentoSpa.count({ where: { hostId, reminderInviato: true, updatedAt: { gte: trenta } } }),
    prisma.auditLog.findMany({
      where: { hostId, azione: 'email.inviata' },
      select: { id: true, dettagli: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title">Email automatiche</h1>
          <p className="text-sm text-gray-500">
            Configura le email che vengono inviate automaticamente a ospiti e host.
          </p>
        </div>
        <EmailTriggerButton />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox icon={<Mail className="w-4 h-4" />} label="Pre check-in" value={preCheckinInviati} color="bg-blue-50 text-blue-500" />
        <StatBox icon={<CalendarCheck className="w-4 h-4" />} label="Reminder arrivo" value={reminderInviati} color="bg-indigo-50 text-indigo-500" />
        <StatBox icon={<CheckCircle2 className="w-4 h-4" />} label="Follow-up" value={followUpInviati} color="bg-amber-50 text-amber-500" />
        <StatBox icon={<Sparkles className="w-4 h-4" />} label="Reminder SPA" value={spaReminderInviati} color="bg-violet-50 text-violet-500" />
      </div>

      {/* Config UI */}
      <EmailConfig />

      {/* Recent activity */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Attività recente</h2>
        {ultimiInvii.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nessuna email inviata di recente.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {ultimiInvii.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-sm text-gray-700 flex-1 truncate">{u.dettagli}</p>
                <span className="text-xs text-gray-400 shrink-0">
                  {format(new Date(u.createdAt), 'd MMM HH:mm', { locale: it })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-lg font-extrabold text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-500">{label} (30gg)</p>
      </div>
    </div>
  )
}
