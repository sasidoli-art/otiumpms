import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { formatData, formatValuta, pianoLabel, statoAbbonamentoLabel, statoAbbonamentoColor, statoPagamentoLabel, statoPagamentoColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Calendar, CreditCard, ArrowUpRight, Clock, History } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { PLAN_DEFINITIONS, getPlanDefinition, daysRemaining } from '@/lib/billing'
import { PianoTipo } from '@prisma/client'
import PlanUpgradeButton from './plan-upgrade-button'

export default async function HostAbbonamentoPage() {
  const session = await getServerSession(authOptions)
  const hostId = await getHostId()
  if (!session || !hostId) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    include: {
      abbonamenti: { orderBy: { createdAt: 'desc' }, take: 10 },
      pagamenti: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!host) redirect('/login')

  const t = await getTranslations('host.subscription')
  const tb = await getTranslations('host.billing')

  const currentPlan = getPlanDefinition(host.piano)
  const giorniRimanenti = daysRemaining(host.dataFineAbb)
  const allPlans = Object.values(PLAN_DEFINITIONS).sort((a, b) => a.tier - b.tier)

  const BENEFICI: Record<string, string[]> = {
    EVENTO_SINGOLO: [
      t('featuredNewsletter'),
      t('featuredBadge'),
      t('regionalVisibility'),
      t('duration1Week'),
      t('viewStats'),
    ],
    VISIBILITA_MENSILE: [
      t('allFeatured'),
      t('priorityPosition'),
      t('weeklyNewsletter'),
      t('regionalNational'),
      t('detailedStats'),
      t('emailSupport'),
    ],
    PARTNER_PREMIUM: [
      t('allMonthly'),
      t('homepageSection'),
      t('partnerPage'),
      t('aiEditorial'),
      t('accountManager'),
      t('advancedAnalytics'),
      t('absolutePriority'),
      t('logoNewsletter'),
    ],
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{tb('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{tb('subtitle')}</p>
      </div>

      {/* Current plan summary */}
      <div className="card p-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">{tb('currentPlan')}</p>
            <h2 className="text-2xl font-bold text-gray-900">{pianoLabel(host.piano)}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatValuta(currentPlan.prezzoMensile)}{tb('perMonth')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statoAbbonamentoColor(host.statoAbbonamento)}>
              {statoAbbonamentoLabel(host.statoAbbonamento)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {host.dataInizioAbb && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <Calendar size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">{tb('startDate')}</p>
                <p className="text-sm font-medium">{formatData(host.dataInizioAbb)}</p>
              </div>
            </div>
          )}
          {host.dataFineAbb && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <Calendar size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">{tb('endDate')}</p>
                <p className="text-sm font-medium">{formatData(host.dataFineAbb)}</p>
              </div>
            </div>
          )}
          {giorniRimanenti > 0 && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <Clock size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Giorni rimanenti</p>
                <p className="text-sm font-medium">{giorniRimanenti}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <ArrowUpRight size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">{tb('maxStructures')}</p>
              <p className="text-sm font-medium">{currentPlan.maxStrutture}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">{t('includes')}</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(BENEFICI[host.piano] || []).map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Plan comparison cards */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{tb('changePlan')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {allPlans.map((plan) => {
            const isCurrent = plan.piano === host.piano
            const isUpgrade = plan.tier > currentPlan.tier
            const benefici = BENEFICI[plan.piano] || []

            return (
              <div
                key={plan.piano}
                className={`card p-6 relative ${
                  isCurrent
                    ? 'ring-2 ring-brand-500'
                    : plan.piano === 'PARTNER_PREMIUM'
                      ? 'ring-1 ring-amber-300'
                      : ''
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-4 px-3 py-0.5 bg-brand-500 text-white text-xs font-medium rounded-full">
                    {tb('currentBadge')}
                  </span>
                )}
                {!isCurrent && plan.piano === 'VISIBILITA_MENSILE' && (
                  <span className="absolute -top-3 left-4 px-3 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full">
                    {tb('recommended')}
                  </span>
                )}

                <h4 className="text-lg font-bold text-gray-900 mb-1">{plan.label}</h4>
                <p className="text-2xl font-bold text-brand-600 mb-4">
                  {formatValuta(plan.prezzoMensile)}
                  <span className="text-sm font-normal text-gray-400">{tb('perMonth')}</span>
                </p>

                <div className="space-y-2 mb-6 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>{tb('maxStructures')}</span>
                    <span className="font-medium">{plan.maxStrutture}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{tb('maxUnits')}</span>
                    <span className="font-medium">{plan.maxUnita}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{tb('maxEvents')}</span>
                    <span className="font-medium">
                      {plan.maxEventi === -1 ? tb('unlimited') : plan.maxEventi}
                    </span>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-6">
                  {benefici.slice(0, 5).map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                      {b}
                    </li>
                  ))}
                  {benefici.length > 5 && (
                    <li className="text-xs text-gray-400">
                      +{benefici.length - 5} altri vantaggi
                    </li>
                  )}
                </ul>

                {isCurrent ? (
                  <div className="w-full py-2 text-center text-sm text-gray-400 border border-gray-200 rounded-lg">
                    {tb('yourPlan')}
                  </div>
                ) : (
                  <PlanUpgradeButton
                    targetPlan={plan.piano}
                    targetLabel={plan.label}
                    targetPrice={plan.prezzoMensile}
                    isUpgrade={isUpgrade}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* History section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Subscription history */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <History size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900">{tb('subscriptionHistory')}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {host.abbonamenti.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">{tb('noHistory')}</p>
            ) : host.abbonamenti.map(a => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{pianoLabel(a.piano)}</span>
                  <Badge className={statoAbbonamentoColor(a.stato)}>
                    {statoAbbonamentoLabel(a.stato)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatData(a.dataInizio)} — {a.dataFine ? formatData(a.dataFine) : '—'}
                  {' · '}{formatValuta(a.prezzoMensile)}{tb('perMonth')}
                </p>
                {a.note && <p className="text-xs text-gray-400 mt-0.5">{a.note}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Payment history */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <CreditCard size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900">{tb('paymentHistory')}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {host.pagamenti.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">{tb('noPaymentHistory')}</p>
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
  )
}
