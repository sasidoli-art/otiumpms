'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Bug, Loader2, ChevronDown, Send, Trash2, Clock,
  CheckCircle, Wrench, XCircle, User, Building2,
  AlertTriangle, Lightbulb, HelpCircle, ShieldAlert, MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Ticket = {
  id: string
  oggetto: string
  descrizione: string
  categoria: string
  priorita: string
  stato: string
  paginaUrl: string | null
  userAgent: string | null
  rispostaAdmin: string | null
  rispostoDa: string | null
  rispostoAt: string | null
  createdAt: string
  updatedAt: string
  user: { nome: string; cognome: string; email: string; role: string }
  host: { nomeAzienda: string } | null
}

const STATO_ICON: Record<string, React.ReactNode> = {
  APERTO: <Clock size={14} className="text-yellow-500" />,
  IN_LAVORAZIONE: <Wrench size={14} className="text-blue-500" />,
  RISOLTO: <CheckCircle size={14} className="text-green-500" />,
  CHIUSO: <XCircle size={14} className="text-slate-400" />,
}

const STATO_COLOR: Record<string, string> = {
  APERTO: 'bg-yellow-100 text-yellow-700',
  IN_LAVORAZIONE: 'bg-blue-100 text-blue-700',
  RISOLTO: 'bg-green-100 text-green-700',
  CHIUSO: 'bg-slate-100 text-slate-600',
}

const PRIORITA_COLOR: Record<string, string> = {
  BASSA: 'bg-slate-100 text-slate-600',
  NORMALE: 'bg-blue-100 text-blue-600',
  ALTA: 'bg-orange-100 text-orange-600',
  URGENTE: 'bg-red-100 text-red-600',
}

const CAT_ICON: Record<string, React.ReactNode> = {
  BUG: <Bug size={14} />,
  FEATURE_REQUEST: <Lightbulb size={14} />,
  DOMANDA: <HelpCircle size={14} />,
  PROBLEMA_ACCOUNT: <ShieldAlert size={14} />,
  ALTRO: <MoreHorizontal size={14} />,
}

export function TicketBoard() {
  const t = useTranslations('ticket')
  const tc = useTranslations('common')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [counts, setCounts] = useState<{ stato: string; _count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState('')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [risposta, setRisposta] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroStato) params.set('stato', filtroStato)
    const res = await fetch(`/api/admin/ticket?${params}`)
    if (res.ok) {
      const data = await res.json()
      setTickets(data.tickets)
      setCounts(data.counts)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filtroStato])

  async function updateTicket(id: string, data: Record<string, string>) {
    setSaving(true)
    const res = await fetch(`/api/admin/ticket/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setTickets(prev => prev.map(tk => tk.id === id ? { ...tk, ...updated } : tk))
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...updated } : prev)
    }
    setSaving(false)
  }

  async function deleteTicket(id: string) {
    if (!confirm(t('confirmDelete'))) return
    await fetch(`/api/admin/ticket/${id}`, { method: 'DELETE' })
    setTickets(prev => prev.filter(tk => tk.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function sendReply(id: string) {
    if (!risposta.trim()) return
    await updateTicket(id, { rispostaAdmin: risposta, stato: 'IN_LAVORAZIONE' })
    setRisposta('')
  }

  const countByStato = (stato: string) => counts.find(c => c.stato === stato)?._count ?? 0

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bug size={24} className="text-red-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('adminTitle')}</h1>
            <p className="text-sm text-slate-500">{t('adminSubtitle')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {['APERTO', 'IN_LAVORAZIONE', 'RISOLTO', 'CHIUSO'].map(stato => (
          <button
            key={stato}
            onClick={() => setFiltroStato(filtroStato === stato ? '' : stato)}
            className={cn(
              'flex items-center gap-2 p-3 rounded-xl border transition-all',
              filtroStato === stato
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
            )}
          >
            {STATO_ICON[stato]}
            <div className="text-left">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{countByStato(stato)}</p>
              <p className="text-[10px] text-slate-500">{t(`stati.${stato}`)}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Ticket list */}
        <div className="flex-1 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bug className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('noTickets')}</p>
            </div>
          ) : tickets.map(tk => (
            <button
              key={tk.id}
              onClick={() => { setSelected(tk); setRisposta(tk.rispostaAdmin ?? '') }}
              className={cn(
                'w-full text-left p-4 rounded-xl border transition-all',
                selected?.id === tk.id
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {CAT_ICON[tk.categoria]}
                <span className="text-sm font-semibold text-slate-900 dark:text-white flex-1 truncate">{tk.oggetto}</span>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATO_COLOR[tk.stato])}>
                  {t(`stati.${tk.stato}`)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <User size={10} /> {tk.user.nome} {tk.user.cognome}
                </span>
                {tk.host && (
                  <span className="flex items-center gap-1">
                    <Building2 size={10} /> {tk.host.nomeAzienda}
                  </span>
                )}
                <span>{new Date(tk.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
                <span className={cn('px-1.5 py-0.5 rounded', PRIORITA_COLOR[tk.priorita])}>
                  {t(`priorita.${tk.priorita}`)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 sticky top-6 self-start max-h-[calc(100vh-120px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATO_COLOR[selected.stato])}>
                {t(`stati.${selected.stato}`)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteTicket(selected.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                  title={tc('delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-slate-900 dark:text-white mb-1">{selected.oggetto}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <span>{selected.user.nome} {selected.user.cognome} ({selected.user.email})</span>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
              {selected.descrizione}
            </div>

            {selected.paginaUrl && (
              <p className="text-[10px] text-slate-400 mb-2">
                <span className="font-semibold">URL:</span> {selected.paginaUrl}
              </p>
            )}

            {/* Status change */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('changeStatus')}</label>
              <div className="flex gap-1">
                {['APERTO', 'IN_LAVORAZIONE', 'RISOLTO', 'CHIUSO'].map(s => (
                  <button
                    key={s}
                    onClick={() => updateTicket(selected.id, { stato: s })}
                    disabled={saving}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-all',
                      selected.stato === s ? STATO_COLOR[s] + ' border-current' : 'border-slate-200 dark:border-slate-600 text-slate-400'
                    )}
                  >
                    {STATO_ICON[s]}
                    {t(`stati.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin reply */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('adminReply')}</label>
              <textarea
                value={risposta}
                onChange={e => setRisposta(e.target.value)}
                rows={3}
                placeholder={t('replyPlaceholder')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
              <button
                onClick={() => sendReply(selected.id)}
                disabled={saving || !risposta.trim()}
                className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send size={12} /> {t('sendReply')}
              </button>

              {selected.rispostoDa && selected.rispostoAt && (
                <p className="text-[10px] text-slate-400 mt-2">
                  {t('repliedBy', {
                    name: selected.rispostoDa,
                    date: new Date(selected.rispostoAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
