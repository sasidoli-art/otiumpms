import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Bell, Mail, FileText, CreditCard, Globe, Shield, Info } from 'lucide-react'
import PasswordForm from './password-form'
import { getTranslations } from 'next-intl/server'

export const metadata = { title: 'Impostazioni — Admin' }

export default async function ImpostazioniPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const t = await getTranslations('admin.settings')
  const tc = await getTranslations('common')

  // Valori env (mascherati per sicurezza)
  const smtpHost = process.env.EMAIL_HOST || '—'
  const smtpPort = process.env.EMAIL_PORT || '—'
  const smtpUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{3}).*(@.*)/, '$1***$2') : '—'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '—'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Piattaforma — read-only */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-brand-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('platform')}</h2>
          </div>
          <div className="space-y-3">
            <InfoRow label={t('platformName')} value="Otium Week" />
            <InfoRow label={t('siteUrl')} value={appUrl} />
            <InfoRow label={t('supportEmail')} value="info@otiumweek.it" />
          </div>
          <EnvNote label={t('securityNote')} />
        </div>

        {/* Notifiche — read-only */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('notificationsSection')}</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: t('newBookingReceived'), attivo: true },
              { label: t('paymentReceived'), attivo: true },
              { label: t('newHostRegistered'), attivo: true },
              { label: t('eventPendingApproval'), attivo: true },
              { label: t('subscriptionExpiring'), attivo: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.attivo ? 'bg-green-400' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className={`ml-auto text-xs font-medium ${item.attivo ? 'text-green-600' : 'text-gray-400'}`}>
                  {item.attivo ? t('notifEnabled') : t('notifDisabled')}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            {t('notifNote')}
          </p>
        </div>

        {/* Email SMTP — read-only */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('smtp')}</h2>
          </div>
          <div className="space-y-3">
            <InfoRow label={t('smtpHost')} value={smtpHost} />
            <InfoRow label={t('port')} value={smtpPort} />
            <InfoRow label={t('user')} value={smtpUser} />
            <InfoRow label={t('password')} value="••••••••" />
          </div>
          <EnvNote label={t('securityNote')} />
        </div>

        {/* Fatturazione — read-only */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('billing')}</h2>
          </div>
          <div className="space-y-3">
            <InfoRow label={t('companyName')} value="Otium Week S.r.l." />
            <InfoRow label={t('vatNumber')} value="IT00000000000" />
            <InfoRow label={t('defaultVat')} value="22%" />
          </div>
          <EnvNote label={t('securityNote')} />
        </div>

        {/* Piani abbonamento — read-only tabella */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('subscriptionPlans')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-th">{t('plan')}</th>
                  <th className="table-th">{tc('price')}</th>
                  <th className="table-th">{t('maxEvents')}</th>
                  <th className="table-th">{t('maxStructures')}</th>
                  <th className="table-th">{tc('description')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { nome: t('singleEventPlan'), prezzo: t('singleEventPrice'), eventi: 1, strutture: 1, desc: t('singleEventDesc') },
                  { nome: t('monthlyPlan'), prezzo: t('monthlyPrice'), eventi: 10, strutture: 3, desc: t('monthlyDesc') },
                  { nome: t('premiumPlan'), prezzo: t('premiumPrice'), eventi: 999, strutture: 10, desc: t('premiumDesc') },
                ].map((p, i) => (
                  <tr key={i}>
                    <td className="table-td font-medium">{p.nome}</td>
                    <td className="table-td text-brand-600 font-semibold">{p.prezzo}</td>
                    <td className="table-td">{p.eventi === 999 ? t('unlimited') : p.eventi}</td>
                    <td className="table-td">{p.strutture}</td>
                    <td className="table-td text-gray-500">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sicurezza — FUNZIONANTE */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('security')}</h2>
          </div>
          <PasswordForm />
        </div>
      </div>
    </div>
  )
}

// ─── Componenti helper ────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function EnvNote({ label }: { label: string }) {
  return (
    <p className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-1.5">
      <Info className="w-3.5 h-3.5 shrink-0" />
      {label}
    </p>
  )
}
