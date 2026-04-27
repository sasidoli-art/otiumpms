'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Loader2, CheckCircle2, Banknote, Building, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatValuta } from '@/lib/formatters'

type Pagamento = { id: string; importo: number; metodo: string; provider: string; ultime4Cifre: string | null; circuito: string | null; stato: string; createdAt: string }

const METODI = [
  { id: 'CARTA', label: 'Carta', icon: CreditCard },
  { id: 'CONTANTI', label: 'Contanti', icon: Banknote },
  { id: 'BONIFICO', label: 'Bonifico', icon: Building },
]

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function PagamentoCheckoutSection({ prenotazioneId, saldoDovuto }: { prenotazioneId: string; saldoDovuto: number }) {
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([])
  const [totalePagato, setTotalePagato] = useState(0)
  const [totaleAddebiti, setTotaleAddebiti] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successo, setSuccesso] = useState(false)
  const [form, setForm] = useState({ importo: '', metodo: 'CARTA', ultime4Cifre: '', circuito: '', note: '' })

  useEffect(() => {
    Promise.all([
      fetch(`/api/host/pagamento-checkout?prenotazioneId=${prenotazioneId}`).then(r => r.ok ? r.json() : { pagamenti: [], totalePagato: 0 }),
      fetch(`/api/host/prenotazioni/${prenotazioneId}/addebiti`).then(r => r.ok ? r.json() : { totale: 0 }),
    ]).then(([pag, add]) => {
      setPagamenti(pag.pagamenti)
      setTotalePagato(pag.totalePagato)
      setTotaleAddebiti(add.totale ?? 0)
    }).finally(() => setLoading(false))
  }, [prenotazioneId])

  async function registra(e: React.FormEvent) {
    e.preventDefault()
    if (!form.importo) return
    setSaving(true); setSuccesso(false)
    const res = await fetch('/api/host/pagamento-checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenotazioneId, importo: parseFloat(form.importo), metodo: form.metodo, ultime4Cifre: form.ultime4Cifre || null, circuito: form.circuito || null, note: form.note || null }),
    })
    if (res.ok) {
      const p = await res.json()
      setPagamenti(prev => [p, ...prev])
      setTotalePagato(prev => prev + p.importo)
      setForm({ importo: '', metodo: 'CARTA', ultime4Cifre: '', circuito: '', note: '' })
      setShowForm(false); setSuccesso(true)
      setTimeout(() => setSuccesso(false), 2000)
    }
    setSaving(false)
  }

  const totaleDovuto = saldoDovuto + totaleAddebiti
  const saldo = Math.round((totaleDovuto - totalePagato) * 100) / 100

  if (loading) return null

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-brand-500" /> Pagamenti
        </h2>
        {successo && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Registrato</span>}
      </div>

      {/* Saldo */}
      <div className="flex items-center justify-between mb-3 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800">
        <div className="text-xs text-gray-500 space-y-0.5">
          <p>Soggiorno: <span className="font-medium">€{saldoDovuto.toFixed(2)}</span></p>
          {totaleAddebiti > 0 && <p>Extra: <span className="font-medium text-blue-600">€{totaleAddebiti.toFixed(2)}</span></p>}
          <p>Totale: <span className="font-bold">€{totaleDovuto.toFixed(2)}</span></p>
          <p>Pagato: <span className="font-medium text-green-600">€{totalePagato.toFixed(2)}</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Saldo</p>
          <p className={`text-lg font-extrabold ${saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {saldo > 0 ? formatValuta(saldo) : 'SALDATO'}
          </p>
        </div>
      </div>

      {/* Lista pagamenti */}
      {pagamenti.map(p => (
        <div key={p.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-50 dark:border-slate-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span className="font-medium">€{p.importo.toFixed(2)}</span>
          <span className="text-gray-400">{p.metodo}{p.circuito ? ` (${p.circuito})` : ''}{p.ultime4Cifre ? ` ****${p.ultime4Cifre}` : ''}</span>
        </div>
      ))}

      {/* Bottone + form */}
      {saldo > 0 && !showForm && (
        <button onClick={() => { setShowForm(true); setForm(f => ({ ...f, importo: String(saldo) })) }}
          className="w-full mt-3 btn-primary text-sm flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Registra pagamento
        </button>
      )}

      {showForm && (
        <form onSubmit={registra} className="mt-3 space-y-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <div className="flex gap-1.5">
            {METODI.map(m => {
              const Icon = m.icon
              return (
                <button key={m.id} type="button" onClick={() => setForm(f => ({ ...f, metodo: m.id }))}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 ${form.metodo === m.id ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 text-brand-700' : 'border-gray-200 dark:border-slate-600 text-gray-500'}`}>
                  <Icon className="w-3.5 h-3.5" /> {m.label}
                </button>
              )
            })}
          </div>
          <input type="number" step="0.01" value={form.importo} onChange={e => setForm(f => ({ ...f, importo: e.target.value }))} placeholder="Importo €" className={inp} required />
          {form.metodo === 'CARTA' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={form.ultime4Cifre} onChange={e => setForm(f => ({ ...f, ultime4Cifre: e.target.value.slice(0, 4) }))} placeholder="Ultime 4 cifre" maxLength={4} className={inp} />
              <select value={form.circuito} onChange={e => setForm(f => ({ ...f, circuito: e.target.value }))} className={inp}>
                <option value="">Circuito</option>
                <option value="VISA">Visa</option><option value="MASTERCARD">Mastercard</option>
                <option value="AMEX">Amex</option><option value="BANCOMAT">Bancomat</option>
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? 'Salvo...' : 'Registra'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs">Annulla</button>
          </div>
        </form>
      )}
    </div>
  )
}
