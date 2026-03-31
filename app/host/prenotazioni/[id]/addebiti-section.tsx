'use client'

import { useState, useEffect } from 'react'
import { Receipt, Plus, Loader2, X } from 'lucide-react'

type Addebito = { id: string; descrizione: string; quantita: number; prezzoUnitario: number; aliquotaIva: number; totale: number; data: string; addebitatoDa: string | null; servizio: { nome: string; categoria: string } | null }
type RiepilogoIva = { aliquota: number; imponibile: number; imposta: number; totale: number }
type Servizio = { id: string; nome: string; prezzo: number; aliquotaIva: number; categoria: string; attivo?: boolean }

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function AddebitiSection({ prenotazioneId }: { prenotazioneId: string }) {
  const [addebiti, setAddebiti] = useState<Addebito[]>([])
  const [totale, setTotale] = useState(0)
  const [riepilogoIva, setRiepilogoIva] = useState<RiepilogoIva[]>([])
  const [servizi, setServizi] = useState<Servizio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formMode, setFormMode] = useState<'servizio' | 'manuale'>('servizio')
  const [servizioId, setServizioId] = useState('')
  const [manuale, setManuale] = useState({ descrizione: '', prezzoUnitario: '', aliquotaIva: '22', quantita: '1' })

  async function carica() {
    setLoading(true)
    const [aRes, sRes] = await Promise.all([
      fetch(`/api/host/prenotazioni/${prenotazioneId}/addebiti`),
      fetch('/api/host/servizi'),
    ])
    if (aRes.ok) { const d = await aRes.json(); setAddebiti(d.addebiti); setTotale(d.totale); setRiepilogoIva(d.riepilogoIva) }
    if (sRes.ok) setServizi(await sRes.json())
    setLoading(false)
  }

  useEffect(() => { carica() }, [prenotazioneId])

  async function addebita(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body = formMode === 'servizio'
      ? { servizioId, quantita: 1 }
      : { descrizione: manuale.descrizione, prezzoUnitario: parseFloat(manuale.prezzoUnitario) || 0, aliquotaIva: parseFloat(manuale.aliquotaIva), quantita: parseInt(manuale.quantita) || 1 }
    const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/addebiti`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) { setShowForm(false); setServizioId(''); setManuale({ descrizione: '', prezzoUnitario: '', aliquotaIva: '22', quantita: '1' }); carica() }
    setSaving(false)
  }

  if (loading) return null

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand-500" /> Conto
          {totale > 0 && <span className="text-sm font-bold text-brand-600">€{totale.toFixed(2)}</span>}
        </h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="text-xs text-brand-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Addebita</button>}
      </div>

      {/* Lista addebiti */}
      {addebiti.length === 0 && !showForm && <p className="text-xs text-gray-400 italic">Nessun addebito.</p>}
      {addebiti.map(a => (
        <div key={a.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 dark:border-slate-800">
          <div>
            <span className="font-medium">{a.descrizione}</span>
            {a.quantita > 1 && <span className="text-gray-400 ml-1">×{a.quantita}</span>}
            <span className="text-gray-400 ml-2">IVA {a.aliquotaIva}%</span>
          </div>
          <span className="font-bold">€{a.totale.toFixed(2)}</span>
        </div>
      ))}

      {/* Riepilogo IVA */}
      {riepilogoIva.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 space-y-0.5">
          {riepilogoIva.map(r => (
            <div key={r.aliquota} className="flex justify-between text-[10px] text-gray-400">
              <span>IVA {r.aliquota}%: imponibile €{r.imponibile.toFixed(2)}</span>
              <span>imposta €{r.imposta.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold pt-1">
            <span>TOTALE</span><span className="text-brand-600">€{totale.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Form addebito */}
      {showForm && (
        <form onSubmit={addebita} className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg space-y-2">
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setFormMode('servizio')} className={`text-xs px-3 py-1 rounded ${formMode === 'servizio' ? 'bg-brand-500 text-white' : 'bg-gray-200 dark:bg-slate-700'}`}>Da catalogo</button>
            <button type="button" onClick={() => setFormMode('manuale')} className={`text-xs px-3 py-1 rounded ${formMode === 'manuale' ? 'bg-brand-500 text-white' : 'bg-gray-200 dark:bg-slate-700'}`}>Manuale</button>
          </div>
          {formMode === 'servizio' ? (
            <select value={servizioId} onChange={e => setServizioId(e.target.value)} className={inp} required>
              <option value="">Seleziona servizio...</option>
              {servizi.filter(s => s.attivo !== false).map(s => <option key={s.id} value={s.id}>{s.nome} — €{s.prezzo} (IVA {s.aliquotaIva}%)</option>)}
            </select>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={manuale.descrizione} onChange={e => setManuale(f => ({ ...f, descrizione: e.target.value }))} placeholder="Descrizione" className={`col-span-2 ${inp}`} required />
              <input type="number" step="0.01" value={manuale.prezzoUnitario} onChange={e => setManuale(f => ({ ...f, prezzoUnitario: e.target.value }))} placeholder="€ prezzo" className={inp} required />
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-xs">{saving ? 'Salvo...' : 'Addebita'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs">Annulla</button>
          </div>
        </form>
      )}
    </div>
  )
}
