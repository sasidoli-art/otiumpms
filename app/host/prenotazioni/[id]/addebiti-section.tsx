'use client'

import { useState, useEffect } from 'react'
import { Receipt, Plus, Loader2, X, Waves, Coffee, Shirt, Car, Clock, Tag, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Addebito = { id: string; descrizione: string; quantita: number; prezzoUnitario: number; aliquotaIva: number; totale: number; data: string; addebitatoDa: string | null; servizio: { nome: string; categoria: string } | null }
type RiepilogoIva = { aliquota: number; imponibile: number; imposta: number; totale: number }
type Servizio = { id: string; nome: string; prezzo: number; aliquotaIva: number; categoria: string; attivo?: boolean }

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

// Quick-add: voci comuni che ogni hotel ha
const VOCI_RAPIDE = [
  { label: 'Minibar', icon: Coffee, prezzo: 5, iva: 10, desc: 'Minibar camera' },
  { label: 'Lavanderia', icon: Shirt, prezzo: 15, iva: 22, desc: 'Servizio lavanderia' },
  { label: 'Parcheggio', icon: Car, prezzo: 10, iva: 22, desc: 'Parcheggio giornaliero' },
  { label: 'Late C/O', icon: Clock, prezzo: 30, iva: 10, desc: 'Late check-out' },
  { label: 'Extra', icon: Tag, prezzo: 0, iva: 22, desc: '' },
]

export default function AddebitiSection({ prenotazioneId, guestNome, guestEmail }: { prenotazioneId: string; guestNome?: string; guestEmail?: string }) {
  const [addebiti, setAddebiti] = useState<Addebito[]>([])
  const [totale, setTotale] = useState(0)
  const [riepilogoIva, setRiepilogoIva] = useState<RiepilogoIva[]>([])
  const [servizi, setServizi] = useState<Servizio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importingSpa, setImportingSpa] = useState(false)
  const [formMode, setFormMode] = useState<'servizio' | 'manuale'>('servizio')
  const [servizioId, setServizioId] = useState('')
  const [manuale, setManuale] = useState({ descrizione: '', prezzoUnitario: '', aliquotaIva: '22', quantita: '1' })

  // SPA appointments for this guest
  const [spaAppuntamenti, setSpaAppuntamenti] = useState<{ id: string; trattamento: string; prezzo: number; data: string; stato: string }[]>([])

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

  // Load SPA appointments for this guest
  useEffect(() => {
    if (!guestEmail) return
    fetch(`/api/host/spa/appuntamenti?guestEmail=${encodeURIComponent(guestEmail)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setSpaAppuntamenti(data.filter((a: any) => a.stato === 'COMPLETATO').map((a: any) => ({
            id: a.id,
            trattamento: a.trattamento?.nome ?? 'Trattamento SPA',
            prezzo: a.prezzoTotale ?? 0,
            data: a.dataOra,
            stato: a.stato,
          })))
        }
      })
      .catch(() => {})
  }, [guestEmail])

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

  async function quickAdd(voce: typeof VOCI_RAPIDE[0]) {
    if (voce.label === 'Extra') {
      setFormMode('manuale')
      setShowForm(true)
      setShowQuick(false)
      return
    }
    setSaving(true)
    await fetch(`/api/host/prenotazioni/${prenotazioneId}/addebiti`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descrizione: voce.desc, prezzoUnitario: voce.prezzo, aliquotaIva: voce.iva, quantita: 1 }),
    })
    setSaving(false)
    setShowQuick(false)
    carica()
  }

  async function importaSpa(appId: string, trattamento: string, prezzo: number) {
    setImportingSpa(true)
    await fetch(`/api/host/prenotazioni/${prenotazioneId}/addebiti`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descrizione: `SPA: ${trattamento}`, prezzoUnitario: prezzo, aliquotaIva: 22, quantita: 1 }),
    })
    // Remove from list
    setSpaAppuntamenti(prev => prev.filter(a => a.id !== appId))
    setImportingSpa(false)
    carica()
  }

  if (loading) return null

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-600" /> Conto ospite
          {totale > 0 && <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">€{totale.toFixed(2)}</span>}
        </h2>
        <div className="flex items-center gap-1.5">
          {/* Quick add dropdown */}
          <div className="relative">
            <button onClick={() => setShowQuick(v => !v)} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
              <Plus className="w-3 h-3" /> Rapido <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {showQuick && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 min-w-[160px]">
                {VOCI_RAPIDE.map(v => (
                  <button
                    key={v.label}
                    onClick={() => quickAdd(v)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    <v.icon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="flex-1 text-left">{v.label}</span>
                    {v.prezzo > 0 && <span className="text-slate-400">€{v.prezzo}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!showForm && (
            <button onClick={() => { setShowForm(true); setFormMode('servizio') }} className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
              <Plus className="w-3 h-3" /> Catalogo
            </button>
          )}
        </div>
      </div>

      {/* SPA auto-import */}
      {spaAppuntamenti.length > 0 && (
        <div className="mb-3 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5 mb-2">
            <Waves className="w-3.5 h-3.5" /> Trattamenti SPA da addebitare
          </p>
          {spaAppuntamenti.map(a => (
            <div key={a.id} className="flex items-center justify-between py-1">
              <span className="text-xs text-teal-800 dark:text-teal-300">{a.trattamento} — €{a.prezzo.toFixed(2)}</span>
              <button
                onClick={() => importaSpa(a.id, a.trattamento, a.prezzo)}
                disabled={importingSpa}
                className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 bg-teal-100 hover:bg-teal-200 px-2 py-0.5 rounded transition-colors"
              >
                {importingSpa ? '...' : '+ Addebita'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lista addebiti */}
      {addebiti.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 italic py-3">Nessun addebito extra. Usa i bottoni sopra per aggiungere.</p>
      )}

      {addebiti.length > 0 && (
        <div className="space-y-0.5 mb-3">
          {addebiti.map((a, i) => (
            <div key={a.id} className={cn(
              'flex items-center justify-between text-xs py-2 px-2 rounded group',
              a.totale < 0 ? 'bg-red-50 dark:bg-red-900/10 line-through opacity-60' : '',
              i % 2 === 0 && a.totale >= 0 ? 'bg-slate-50 dark:bg-slate-800/50' : ''
            )}>
              <div className="flex-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">{a.descrizione}</span>
                {a.quantita > 1 && <span className="text-slate-400 ml-1">×{a.quantita}</span>}
                <span className="text-slate-400 ml-2 text-[10px]">IVA {a.aliquotaIva}%</span>
                {a.addebitatoDa && <span className="text-slate-400 ml-2 text-[10px]">({a.addebitatoDa})</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('font-bold', a.totale < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white')}>
                  {a.totale < 0 ? '-' : ''}€{Math.abs(a.totale).toFixed(2)}
                </span>
                {a.totale > 0 && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Stornare "${a.descrizione}" (€${a.totale.toFixed(2)})?`)) return
                      await fetch(`/api/host/prenotazioni/${prenotazioneId}/addebiti/${a.id}/storno`, { method: 'POST' })
                      carica()
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-red-500 hover:text-red-700 font-medium transition-opacity"
                    title="Storna"
                  >
                    Storna
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Riepilogo IVA + Totale */}
      {addebiti.length > 0 && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
          {riepilogoIva.map(r => (
            <div key={r.aliquota} className="flex justify-between text-[10px] text-slate-400">
              <span>IVA {r.aliquota}%: imponibile €{r.imponibile.toFixed(2)}</span>
              <span>imposta €{r.imposta.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
            <span>TOTALE EXTRA</span>
            <span className="text-blue-600">€{totale.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Form addebito da catalogo/manuale */}
      {showForm && (
        <form onSubmit={addebita} className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2 animate-fadeIn">
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setFormMode('servizio')} className={`text-xs px-3 py-1 rounded transition-colors ${formMode === 'servizio' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>Da catalogo</button>
            <button type="button" onClick={() => setFormMode('manuale')} className={`text-xs px-3 py-1 rounded transition-colors ${formMode === 'manuale' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>Manuale</button>
            <button type="button" onClick={() => setShowForm(false)} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          {formMode === 'servizio' ? (
            <select value={servizioId} onChange={e => setServizioId(e.target.value)} className={inp} required>
              <option value="">Seleziona servizio...</option>
              {servizi.filter(s => s.attivo !== false).map(s => <option key={s.id} value={s.id}>{s.nome} — €{s.prezzo} (IVA {s.aliquotaIva}%)</option>)}
            </select>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <input type="text" value={manuale.descrizione} onChange={e => setManuale(f => ({ ...f, descrizione: e.target.value }))} placeholder="Descrizione" className={`col-span-2 ${inp}`} required />
              <input type="number" step="0.01" value={manuale.prezzoUnitario} onChange={e => setManuale(f => ({ ...f, prezzoUnitario: e.target.value }))} placeholder="€ prezzo" className={inp} required />
              <input type="number" value={manuale.quantita} onChange={e => setManuale(f => ({ ...f, quantita: e.target.value }))} placeholder="Qtà" className={inp} min="1" />
            </div>
          )}
          <button type="submit" disabled={saving} className="btn-primary text-xs w-full">
            {saving ? 'Salvataggio...' : 'Addebita'}
          </button>
        </form>
      )}
    </div>
  )
}
