'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import {
  Bug, X, Send, Loader2, CheckCircle, AlertTriangle,
  HelpCircle, Lightbulb, ShieldAlert, MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Categoria = 'BUG' | 'FEATURE_REQUEST' | 'DOMANDA' | 'PROBLEMA_ACCOUNT' | 'ALTRO'
type Priorita = 'BASSA' | 'NORMALE' | 'ALTA' | 'URGENTE'

const CATEGORIE: { value: Categoria; icon: React.ReactNode; color: string }[] = [
  { value: 'BUG', icon: <Bug size={14} />, color: 'text-red-500 bg-red-50 border-red-200' },
  { value: 'FEATURE_REQUEST', icon: <Lightbulb size={14} />, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { value: 'DOMANDA', icon: <HelpCircle size={14} />, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { value: 'PROBLEMA_ACCOUNT', icon: <ShieldAlert size={14} />, color: 'text-purple-500 bg-purple-50 border-purple-200' },
  { value: 'ALTRO', icon: <MoreHorizontal size={14} />, color: 'text-slate-500 bg-slate-50 border-slate-200' },
]

const PRIORITA: { value: Priorita; color: string }[] = [
  { value: 'BASSA', color: 'bg-slate-100 text-slate-600' },
  { value: 'NORMALE', color: 'bg-blue-100 text-blue-600' },
  { value: 'ALTA', color: 'bg-orange-100 text-orange-600' },
  { value: 'URGENTE', color: 'bg-red-100 text-red-600' },
]

export function BugReportButton() {
  const t = useTranslations('ticket')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [myTickets, setMyTickets] = useState<{ id: string; oggetto: string; stato: string; createdAt: string }[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const [form, setForm] = useState({
    oggetto: '',
    descrizione: '',
    categoria: 'BUG' as Categoria,
    priorita: 'NORMALE' as Priorita,
  })

  // Load my tickets when opening history
  useEffect(() => {
    if (!showHistory) return
    fetch('/api/ticket')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMyTickets(data) })
      .catch(() => {})
  }, [showHistory, sent])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.oggetto.trim() || !form.descrizione.trim()) return
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          paginaUrl: pathname,
          userAgent: navigator.userAgent,
        }),
      })

      if (res.ok) {
        setSent(true)
        setForm({ oggetto: '', descrizione: '', categoria: 'BUG', priorita: 'NORMALE' })
        setTimeout(() => { setSent(false); setOpen(false) }, 2500)
      } else {
        const data = await res.json()
        setError(data.error || t('submitError'))
      }
    } catch {
      setError(t('networkError'))
    } finally {
      setSending(false)
    }
  }

  const statoColor: Record<string, string> = {
    APERTO: 'bg-yellow-100 text-yellow-700',
    IN_LAVORAZIONE: 'bg-blue-100 text-blue-700',
    RISOLTO: 'bg-green-100 text-green-700',
    CHIUSO: 'bg-slate-100 text-slate-700',
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setSent(false); setError('') }}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
        title={t('reportBug')}
      >
        <Bug size={20} />
        <span className="absolute right-full mr-3 px-2.5 py-1 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {t('reportBug')}
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !sending && setOpen(false)} />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Bug size={18} className="text-red-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">{t('title')}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showHistory ? t('newTicket') : t('myTickets')}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Success state */}
            {sent && (
              <div className="p-10 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-900 dark:text-white">{t('sent')}</p>
                <p className="text-sm text-slate-500 mt-1">{t('sentDesc')}</p>
              </div>
            )}

            {/* Ticket history */}
            {showHistory && !sent && (
              <div className="p-6">
                {myTickets.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">{t('noTickets')}</p>
                ) : (
                  <div className="space-y-2">
                    {myTickets.map(tk => (
                      <div key={tk.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tk.oggetto}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(tk.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statoColor[tk.stato] ?? 'bg-slate-100')}>
                          {t(`stati.${tk.stato}`)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            {!showHistory && !sent && (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Categoria */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t('category')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIE.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, categoria: c.value }))}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                          form.categoria === c.value ? c.color + ' border-current' : 'border-slate-200 dark:border-slate-600 text-slate-400'
                        )}
                      >
                        {c.icon}
                        {t(`categorie.${c.value}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Oggetto */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('subject')} *</label>
                  <input
                    type="text"
                    value={form.oggetto}
                    onChange={e => setForm(f => ({ ...f, oggetto: e.target.value }))}
                    placeholder={t('subjectPlaceholder')}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                    required
                    maxLength={200}
                  />
                </div>

                {/* Descrizione */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('description')} *</label>
                  <textarea
                    value={form.descrizione}
                    onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
                    placeholder={t('descriptionPlaceholder')}
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors resize-none"
                    required
                    minLength={10}
                    maxLength={5000}
                  />
                </div>

                {/* Priorità */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t('priority')}</label>
                  <div className="flex gap-1.5">
                    {PRIORITA.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, priorita: p.value }))}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                          form.priorita === p.value ? p.color + ' border-current' : 'border-slate-200 dark:border-slate-600 text-slate-400'
                        )}
                      >
                        {t(`priorita.${p.value}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-context note */}
                <p className="text-[10px] text-slate-400">
                  {t('autoContext')}
                </p>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending || !form.oggetto.trim() || !form.descrizione.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {sending ? t('sending') : t('submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
