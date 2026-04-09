'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import Link from 'next/link'
import {
  Building2, ExternalLink, Bot, UserCheck, Power, Loader2, Plus, X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

type Host = {
  id: string
  nomeAzienda: string
  citta: string | null
  piano: string
  statoAbbonamento: string
  dataFineAbb: string | null
  conciergeAttivo: boolean
  moduliAttivi: Record<string, boolean> | null
  user: { email: string; nome: string; cognome: string; attivo: boolean }
  _count: { strutture: number; prenotazioni: number; fatture: number }
  createdAt: string
}

const STATO_COLORI: Record<string, string> = {
  ATTIVO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  IN_PROVA: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SOSPESO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SCADUTO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const UPSELL_MODES = [
  { value: 'off', labelKey: 'inactive' as const, icon: Power, color: 'text-gray-400' },
  { value: 'manual', labelKey: 'manual' as const, icon: UserCheck, color: 'text-blue-600' },
  { value: 'ai', labelKey: 'ai' as const, icon: Bot, color: 'text-purple-600' },
]

const PIANI = ['LIGHT', 'EVENTO_SINGOLO', 'VISIBILITA_MENSILE', 'PARTNER_PREMIUM']

export default function HostManager({ hostsIniziali }: { hostsIniziali: Host[] }) {
  const [hosts, setHosts] = useState(hostsIniziali)
  const [saving, setSaving] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ email: '', password: '', nome: '', cognome: '', nomeAzienda: '', citta: '', piano: 'LIGHT' })
  const [newLoading, setNewLoading] = useState(false)
  const [newError, setNewError] = useState('')
  const tc = useTranslations('common')

  async function creaHost(e: React.FormEvent) {
    e.preventDefault()
    setNewLoading(true)
    setNewError('')
    try {
      const res = await fetch('/api/superadmin/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setNewError(j.error ?? 'Errore creazione')
        setNewLoading(false)
        return
      }
      // Ricarica pagina per aggiornare lista
      window.location.reload()
    } catch {
      setNewError('Errore di rete')
      setNewLoading(false)
    }
  }

  const upsellLabels: Record<string, string> = {
    off: tc('inactive'),
    manual: 'Manuale',
    ai: 'AI',
  }

  function getUpsellMode(h: Host): string {
    const moduli = h.moduliAttivi || {}
    if (!moduli.upselling) return 'off'
    if (h.conciergeAttivo && moduli.concierge) return 'ai'
    return 'manual'
  }

  async function setUpsellMode(hostId: string, mode: string) {
    setSaving(hostId)

    // Aggiorna moduli upselling + concierge
    const updates: Record<string, boolean> = {}
    if (mode === 'off') {
      updates.upselling = false
    } else if (mode === 'manual') {
      updates.upselling = true
    } else if (mode === 'ai') {
      updates.upselling = true
      updates.concierge = true
    }

    const res = await fetch(`/api/superadmin/host/${hostId}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduliAttivi: updates,
        conciergeAttivo: mode === 'ai',
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setHosts(prev => prev.map(h => h.id === hostId ? { ...h, moduliAttivi: updated.moduliAttivi, conciergeAttivo: updated.conciergeAttivo } : h))
    }
    setSaving(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Host & Clienti</h1>
          <p className="text-sm text-gray-500">{hosts.length} host registrati</p>
        </div>
        <button
          onClick={() => { setShowNew(true); setNewError(''); setNewForm({ email: '', password: '', nome: '', cognome: '', nomeAzienda: '', citta: '', piano: 'LIGHT' }) }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuovo Host
        </button>
      </div>

      {/* Modale Nuovo Host */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNew(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <button onClick={() => setShowNew(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">Nuovo Host</h2>
            <form onSubmit={creaHost} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nome *</label>
                  <input required value={newForm.nome} onChange={e => setNewForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Cognome *</label>
                  <input required value={newForm.cognome} onChange={e => setNewForm(f => ({ ...f, cognome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nome azienda *</label>
                <input required value={newForm.nomeAzienda} onChange={e => setNewForm(f => ({ ...f, nomeAzienda: e.target.value }))}
                  placeholder="Hotel Bellavista" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Email *</label>
                  <input required type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="host@email.com" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Password *</label>
                  <input required type="password" minLength={6} value={newForm.password} onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Città</label>
                  <input value={newForm.citta} onChange={e => setNewForm(f => ({ ...f, citta: e.target.value }))}
                    placeholder="Roma" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Piano</label>
                  <select value={newForm.piano} onChange={e => setNewForm(f => ({ ...f, piano: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200">
                    {PIANI.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              {newError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{newError}</p>}
              <button type="submit" disabled={newLoading}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {newLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {newLoading ? 'Creazione...' : 'Crea Host'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Azienda</th>{/* TODO: i18n */}
                <th className="table-th">Referente</th>{/* TODO: i18n */}
                <th className="table-th">Piano</th>{/* TODO: i18n */}
                <th className="table-th">{tc('status')}</th>
                <th className="table-th text-right">{tc('structures')}</th>
                <th className="table-th text-right">{tc('bookings')}</th>
                <th className="table-th text-center">Upselling</th>
                <th className="table-th">Registrato</th>{/* TODO: i18n */}
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {hosts.map(h => {
                const mode = getUpsellMode(h)
                return (
                  <tr key={h.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="table-td">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{h.nomeAzienda}</p>
                      <p className="text-[10px] text-gray-400">{h.user.email}</p>
                    </td>
                    <td className="table-td text-gray-600 dark:text-slate-300">{h.user.nome} {h.user.cognome}</td>
                    <td className="table-td"><span className="text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded">{h.piano}</span></td>
                    <td className="table-td"><span className={`text-xs px-2 py-0.5 rounded ${STATO_COLORI[h.statoAbbonamento] || ''}`}>{h.statoAbbonamento}</span></td>
                    <td className="table-td text-right">{h._count.strutture}</td>
                    <td className="table-td text-right font-medium">{h._count.prenotazioni}</td>
                    <td className="table-td">
                      <div className="flex items-center justify-center gap-0.5">
                        {saving === h.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          UPSELL_MODES.map(m => {
                            const Icon = m.icon
                            const isActive = mode === m.value
                            return (
                              <button
                                key={m.value}
                                onClick={() => setUpsellMode(h.id, m.value)}
                                title={`Upselling: ${upsellLabels[m.value]}`}
                                className={`p-1.5 rounded transition-all ${
                                  isActive
                                    ? `${m.color} bg-gray-100 dark:bg-slate-700 ring-1 ring-current`
                                    : 'text-gray-300 dark:text-slate-600 hover:text-gray-500'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            )
                          })
                        )}
                      </div>
                      <p className="text-[9px] text-center text-gray-400 mt-0.5">
                        {upsellLabels[mode]}
                      </p>
                    </td>
                    <td className="table-td text-xs text-gray-400">{format(new Date(h.createdAt), 'd MMM yy', { locale: it })}</td>
                    <td className="table-td">
                      <Link href={`/admin/clienti/${h.id}`} className="text-brand-600 hover:underline text-xs flex items-center gap-1">
                        {tc('manage')} <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
