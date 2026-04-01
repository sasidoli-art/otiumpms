'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Waves, CalendarClock, Users, DoorOpen, Sparkles, Euro,
  ChevronRight, Clock, Star, BarChart3
} from 'lucide-react'
import { formatValuta } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const STATO_COLOR: Record<string, string> = {
  PRENOTATO: 'bg-yellow-100 text-yellow-800',
  CONFERMATO: 'bg-green-100 text-green-800',
  IN_CORSO: 'bg-blue-100 text-blue-800',
  COMPLETATO: 'bg-gray-100 text-gray-700',
  ANNULLATO: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
}

interface Appt {
  id: string
  guestNome: string
  guestCognome: string
  dataOra: string
  durata: number
  stato: string
  terapista: { id: string; nome: string; cognome: string; colore: string } | null
  cabina: { id: string; nome: string } | null
  trattamento: { id: string; nome: string } | null
  percorso: { id: string; nome: string } | null
}

export default function SpaDashboard({
  kpi,
  prossimi5,
}: {
  kpi: {
    appuntamentiOggi: number
    appuntamentiMese: number
    totaleTerapisti: number
    totaleCabine: number
    totaleTrattamenti: number
    revenueMese: number
  }
  prossimi5: Appt[]
}) {
  const t = useTranslations('spa.dashboard')

  const STATO_LABEL: Record<string, string> = {
    PRENOTATO: t('booked'), CONFERMATO: t('confirmed'), IN_CORSO: t('inProgress'),
    COMPLETATO: t('completed'), ANNULLATO: t('cancelled'), NO_SHOW: t('noShow'),
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Waves className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={CalendarClock} label={t('todayAppointments')} value={kpi.appuntamentiOggi} color="violet" />
        <KpiCard icon={CalendarClock} label={t('monthAppointments')} value={kpi.appuntamentiMese} color="indigo" />
        <KpiCard icon={Users} label={t('therapists')} value={kpi.totaleTerapisti} color="sky" />
        <KpiCard icon={DoorOpen} label={t('rooms')} value={kpi.totaleCabine} color="teal" />
        <KpiCard icon={Sparkles} label={t('treatments')} value={kpi.totaleTrattamenti} color="amber" />
        <KpiCard icon={Euro} label={t('monthRevenue')} value={formatValuta(kpi.revenueMese)} color="green" isText />
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: '/host/spa/calendario', label: t('calendarLink'), icon: CalendarClock, desc: t('calendarDesc'), color: 'bg-violet-50 border-violet-200 hover:bg-violet-100' },
          { href: '/host/spa/appuntamenti', label: t('appointmentsLink'), icon: CalendarClock, desc: t('appointmentsDesc'), color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
          { href: '/host/spa/trattamenti', label: t('treatments'), icon: Sparkles, desc: t('catalogLink'), color: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
          { href: '/host/spa/percorsi', label: t('pathsLink'), icon: Star, desc: t('pathsDesc'), color: 'bg-rose-50 border-rose-200 hover:bg-rose-100' },
          { href: '/host/spa/terapisti', label: t('therapists'), icon: Users, desc: t('staffLink'), color: 'bg-sky-50 border-sky-200 hover:bg-sky-100' },
          { href: '/host/spa/cabine', label: t('rooms'), icon: DoorOpen, desc: t('roomsLink'), color: 'bg-teal-50 border-teal-200 hover:bg-teal-100' },
          { href: '/host/spa/report', label: t('reportLink'), icon: BarChart3, desc: t('reportDesc'), color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className={cn('flex items-center gap-3 p-4 rounded-xl border transition-colors', item.color)}>
            <item.icon className="w-5 h-5 text-gray-600 shrink-0" />
            <div>
              <div className="font-semibold text-gray-800 text-sm">{item.label}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </Link>
        ))}
      </div>

      {/* Prossimi appuntamenti */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{t('upcomingAppointments')}</h2>
          <Link href="/host/spa/appuntamenti" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            {t('viewAll')} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {prossimi5.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400">{t('noAppointments')}</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {prossimi5.map(a => (
              <li key={a.id} className="px-5 py-3 flex items-center gap-4">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: a.terapista?.colore ?? '#8b5cf6' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {a.guestNome} {a.guestCognome}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>{a.trattamento?.nome ?? a.percorso?.nome ?? '—'}</span>
                    {a.terapista && <span>· {a.terapista.nome} {a.terapista.cognome}</span>}
                    {a.cabina && <span>· {a.cabina.nome}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {format(new Date(a.dataOra), 'dd/MM HH:mm', { locale: it })}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Clock className="w-3 h-3" />{a.durata} min
                  </div>
                </div>
                <Badge className={cn('shrink-0 text-xs', STATO_COLOR[a.stato])}>
                  {STATO_LABEL[a.stato]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon, label, value, color, isText,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  color: string
  isText?: boolean
}) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    sky: 'bg-sky-50 text-sky-600',
    teal: 'bg-teal-50 text-teal-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 shadow-sm">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorMap[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className={cn('font-bold', isText ? 'text-lg' : 'text-2xl')}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
