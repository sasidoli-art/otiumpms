'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import Link from 'next/link'
import {
  Building2, ExternalLink, Bot, UserCheck, Power, Loader2, Plus, Trash2, PauseCircle, PlayCircle,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import NuovoHostForm from './nuovo-host-form'

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
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const tc = useTranslations('common')

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

  async function toggleSospeso(hostId: string, statoCorrente: string) {
    const nuovoStato = statoCorrente === 'SOSPESO' ? 'ATTIVO' : 'SOSPESO'
    const azione = nuovoStato === 'SOSPESO' ? 'sospendere' : 'riattivare'
    if (!confirm(`Vuoi ${azione} questo host?`)) return
    setToggling(hostId)
    const res = await fetch(`/api/superadmin/host/${hostId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statoAbbonamento: nuovoStato }),
    })
    if (res.ok) {
      setHosts(prev => prev.map(h => h.id === hostId ? { ...h, statoAbbonamento: nuovoStato } : h))
    }
    setToggling(null)
  }

  async function deleteHost(hostId: string, nomeAzienda: string) {
    const conferma = prompt(
      `ATTENZIONE: stai per ELIMINARE l'host "${nomeAzienda}" e TUTTI i suoi dati.\nQuesta operazione è IRREVERSIBILE.\n\nScrivi esattamente il nome azienda per confermare:`
    )
    if (conferma !== nomeAzienda) {
      if (conferma !== null) alert('Nome non corrisponde, operazione annullata.')
      return
    }
    setDeleting(hostId)
    const res = await fetch(`/api/superadmin/host/${hostId}?confirm=${encodeURIComponent(nomeAzienda)}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) {
      setHosts(prev => prev.filter(h => h.id !== hostId))
    } else {
      alert('Errore durante l\'eliminazione.')
    }
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
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuovo Host
        </button>
      </div>

      {/* Modale Nuovo Host — form white-glove completo */}
      {showNew && <NuovoHostForm onClose={() => setShowNew(false)} />}

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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleSospeso(h.id, h.statoAbbonamento)}
                          disabled={toggling === h.id}
                          title={h.statoAbbonamento === 'SOSPESO' ? 'Riattiva' : 'Sospendi'}
                          className={`p-1.5 rounded transition-colors ${h.statoAbbonamento === 'SOSPESO' ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                        >
                          {toggling === h.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : h.statoAbbonamento === 'SOSPESO' ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => deleteHost(h.id, h.nomeAzienda)}
                          disabled={deleting === h.id}
                          title="Elimina host"
                          className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          {deleting === h.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                        <Link href={`/superadmin/host/${h.id}`} className="text-brand-600 hover:underline text-xs flex items-center gap-1 ml-1">
                          {tc('manage')} <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
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
