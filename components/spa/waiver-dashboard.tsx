'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  FileText, AlertCircle, CheckCircle2, Clock, Euro, User,
  Heart, Pill, AlertTriangle, Baby, Eye, Download, Loader2
} from 'lucide-react'

type Appuntamento = {
  id: string
  guestNome: string
  guestCognome: string
  guestEmail: string | null
  dataOra: string
  trattamento?: { nome: string }
  percorso?: { nome: string }
  waiver?: {
    confermato: boolean
    incinta: boolean
    incintaMesi: number | null
    allergie: string | null
    patologie: string | null
    farmaci: string | null
  }
  pagamento?: {
    stato: string
    metodo: string
    importo: number
  }
}

export function SpaWaiverDashboard() {
  const t = useTranslations('spa.waiver')
  const tc = useTranslations('common')

  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'appuntamenti' | 'dichiarazioni' | 'pagamenti'>('appuntamenti')
  const [filtro, setFiltro] = useState<'tutti' | 'mancanti' | 'completati'>('tutti')

  useEffect(() => {
    loadAppuntamenti()
  }, [])

  async function loadAppuntamenti() {
    try {
      const res = await fetch('/api/host/spa/appuntamenti?include=waiver,pagamento')
      if (res.ok) {
        const data = await res.json()
        setAppuntamenti(data)
      }
    } catch (error) {
      console.error('Errore caricamento appuntamenti:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtri
  const appuntamentiFiltrati = appuntamenti.filter(a => {
    if (filtro === 'mancanti') return !a.waiver?.confermato
    if (filtro === 'completati') return a.waiver?.confermato
    return true
  })

  // Stats
  const stats = {
    totali: appuntamenti.length,
    waiverCompletati: appuntamenti.filter(a => a.waiver?.confermato).length,
    waiverMancanti: appuntamenti.filter(a => !a.waiver?.confermato).length,
    pagamentiRiscossi: appuntamenti.filter(a => a.pagamento?.stato === 'RISCOSSO').length,
    pagamentiPendenti: appuntamenti.filter(a => a.pagamento?.stato === 'PENDENTE').length,
    totaleDonne: appuntamenti.filter(a => a.waiver?.incinta).length,
    totaleAllergie: appuntamenti.filter(a => a.waiver?.allergie).length,
    totalePatologie: appuntamenti.filter(a => a.waiver?.patologie).length,
  }

  const importoTotale = appuntamenti.reduce((sum, a) => sum + (a.pagamento?.importo || 0), 0)
  const importoRiscosso = appuntamenti
    .filter(a => a.pagamento?.stato === 'RISCOSSO')
    .reduce((sum, a) => sum + (a.pagamento?.importo || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" />
          {t('dashboardTitle')}
        </h1>
        <p className="text-gray-600 mt-1">{t('dashboardSubtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">{t('appointmentsTab')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totali}</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <p className="text-sm text-green-700 mb-1">{t('waiverCompleted')}</p>
          <p className="text-2xl font-bold text-green-600">{stats.waiverCompletati}</p>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <p className="text-sm text-red-700 mb-1">{t('waiverMissing')}</p>
          <p className="text-2xl font-bold text-red-600">{stats.waiverMancanti}</p>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <p className="text-sm text-blue-700 mb-1">{t('collections')}</p>
          <p className="text-2xl font-bold text-blue-600">€ {importoRiscosso.toFixed(0)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['appuntamenti', 'dichiarazioni', 'pagamenti'].map(tKey => (
          <button
            key={tKey}
            onClick={() => { setTab(tKey as any); setFiltro('tutti') }}
            className={`px-4 py-3 font-medium transition ${
              tab === tKey
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tKey === 'appuntamenti' && `📋 ${t('appointmentsTab')}`}
            {tKey === 'dichiarazioni' && `⚠️ ${t('declarationsTab')}`}
            {tKey === 'pagamenti' && `💰 ${t('paymentsTab')}`}
          </button>
        ))}
      </div>

      {/* TAB 1: APPUNTAMENTI */}
      {tab === 'appuntamenti' && (
        <div className="space-y-4">
          {/* Filtri */}
          <div className="flex gap-2">
            {['tutti', 'mancanti', 'completati'].map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filtro === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'tutti' && `${tc('all')} (${stats.totali})`}
                {f === 'mancanti' && `${t('missing')} (${stats.waiverMancanti})`}
                {f === 'completati' && `${t('completed')} (${stats.waiverCompletati})`}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="space-y-3">
            {appuntamentiFiltrati.map(a => (
              <div key={a.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={16} className="text-gray-400" />
                      <p className="font-semibold text-gray-900">
                        {a.guestNome} {a.guestCognome}
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.waiver?.confermato
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.waiver?.confermato ? `✓ ${t('waiver')}` : `⚠ ${t('pending')}`}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{a.trattamento?.nome || a.percorso?.nome || 'Servizio'}</p>
                      <p className="flex items-center gap-1">
                        <Clock size={14} />
                        {format(new Date(a.dataOra), 'EEE d MMM HH:mm', { locale: it })}
                      </p>
                      {a.guestEmail && <p>{a.guestEmail}</p>}
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    {a.pagamento && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">€ {a.pagamento.importo.toFixed(0)}</p>
                        <p className="text-xs text-gray-600">{a.pagamento.metodo}</p>
                      </div>
                    )}
                    <button
                      onClick={() => window.location.href = `/host/spa/appuntamenti/${a.id}`}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                    >
                      {tc('details')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {appuntamentiFiltrati.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {t('noAppointments')}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DICHIARAZIONI CLINICHE */}
      {tab === 'dichiarazioni' && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Gravidanze */}
          <div className="bg-pink-50 rounded-lg border border-pink-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Baby className="w-6 h-6 text-pink-600" />
              <h3 className="font-bold text-gray-900">{t('pregnancies')}</h3>
            </div>
            <p className="text-3xl font-bold text-pink-600 mb-4">{stats.totaleDonne}</p>
            <div className="space-y-2 text-sm">
              {appuntamenti
                .filter(a => a.waiver?.incinta)
                .map(a => (
                  <div key={a.id} className="p-2 bg-white rounded border border-pink-200">
                    <p className="font-medium text-gray-900">
                      {a.guestNome} {a.guestCognome}
                    </p>
                    <p className="text-xs text-gray-600">
                      {t('month')} {a.waiver?.incintaMesi || '?'}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Allergie */}
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <h3 className="font-bold text-gray-900">{t('allergies')}</h3>
            </div>
            <p className="text-3xl font-bold text-orange-600 mb-4">{stats.totaleAllergie}</p>
            <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
              {appuntamenti
                .filter(a => a.waiver?.allergie)
                .map(a => (
                  <div key={a.id} className="p-2 bg-white rounded border border-orange-200">
                    <p className="font-medium text-gray-900">
                      {a.guestNome} {a.guestCognome}
                    </p>
                    <p className="text-xs text-gray-600">{a.waiver?.allergie}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Patologie */}
          <div className="bg-red-50 rounded-lg border border-red-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-6 h-6 text-red-600" />
              <h3 className="font-bold text-gray-900">{t('conditions')}</h3>
            </div>
            <p className="text-3xl font-bold text-red-600 mb-4">{stats.totalePatologie}</p>
            <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
              {appuntamenti
                .filter(a => a.waiver?.patologie)
                .map(a => (
                  <div key={a.id} className="p-2 bg-white rounded border border-red-200">
                    <p className="font-medium text-gray-900">
                      {a.guestNome} {a.guestCognome}
                    </p>
                    <p className="text-xs text-gray-600">{a.waiver?.patologie}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAGAMENTI */}
      {tab === 'pagamenti' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">{t('totalDue')}</p>
              <p className="text-2xl font-bold text-gray-900">€ {importoTotale.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <p className="text-sm text-green-700 mb-1">{t('collected')}</p>
              <p className="text-2xl font-bold text-green-600">€ {importoRiscosso.toFixed(2)}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
              <p className="text-sm text-yellow-700 mb-1">{t('outstanding')}</p>
              <p className="text-2xl font-bold text-yellow-600">€ {(importoTotale - importoRiscosso).toFixed(2)}</p>
            </div>
          </div>

          {/* Tabella pagamenti */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{tc('guest')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Servizio</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t('method')}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">{tc('amount')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{tc('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appuntamenti.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {a.guestNome} {a.guestCognome}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {a.trattamento?.nome || a.percorso?.nome || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {a.pagamento?.metodo || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">
                      € {a.pagamento?.importo.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.pagamento?.stato === 'RISCOSSO'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.pagamento?.stato || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export */}
          <button className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2">
            <Download size={18} />
            {tc('exportCsv')}
          </button>
        </div>
      )}
    </div>
  )
}
