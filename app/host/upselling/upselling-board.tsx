'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  TrendingUp, Plus, X, Loader2, CheckCircle2, XCircle, Euro,
  Users, Target, Award, ChevronLeft, ChevronRight,
} from 'lucide-react'

type Regola = {
  id: string; nome: string; tipoSupplemento: string; supplemento: number
  incentivo: number; incentivoPct: number | null; maxOccupazione: number | null
  attiva: boolean; _count: { proposte: number }
}

type Proposta = {
  id: string; daCameraNome: string; aCameraNome: string; supplementoTotale: number
  stato: string; propostaDa: string; incentivoOperatore: number; createdAt: string
  regola: { nome: string }
  prenotazione: { guestNome: string; guestCognome: string }
}

type Report = {
  riepilogo: { totaleProposte: number; accettate: number; rifiutate: number; conversionRate: number; revenueGenerato: number; incentiviTotali: number }
  perOperatore: { operatore: string; proposte: number; accettate: number; revenue: number; incentivi: number }[]
  proposte: Proposta[]
}

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function UpsellingBoard() {
  const t = useTranslations('host.upselling')
  const tc = useTranslations('common')
  const [tab, setTab] = useState<'report' | 'regole'>('report')
  const [regole, setRegole] = useState<Regola[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [mese, setMese] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [strutture, setStrutture] = useState<{ id: string; nome: string; unita: { id: string; nome: string }[] }[]>([])

  const [form, setForm] = useState({ nome: '', strutturaId: '', daUnitaId: '', aUnitaId: '', tipoSupplemento: 'FISSO', supplemento: '', incentivo: '', maxOccupazione: '80' })

  const carica = useCallback(async () => {
    setLoading(true)
    const [rRes, repRes, sRes] = await Promise.all([
      fetch('/api/host/upsell/regole'),
      fetch(`/api/host/upsell?anno=${anno}&mese=${mese}`),
      fetch('/api/host/strutture'),
    ])
    if (rRes.ok) setRegole(await rRes.json())
    if (repRes.ok) setReport(await repRes.json())
    if (sRes.ok) {
      const data = await sRes.json()
      if (Array.isArray(data)) setStrutture(data)
    }
    setLoading(false)
  }, [anno, mese])

  useEffect(() => { carica() }, [carica])

  async function addRegola(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.aUnitaId) return
    setSaving(true)
    const res = await fetch('/api/host/upsell/regole', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, supplemento: parseFloat(form.supplemento) || 0, incentivo: parseFloat(form.incentivo) || 0, maxOccupazione: parseFloat(form.maxOccupazione) || 80 }),
    })
    if (res.ok) { setShowForm(false); setForm({ nome: '', strutturaId: '', daUnitaId: '', aUnitaId: '', tipoSupplemento: 'FISSO', supplemento: '', incentivo: '', maxOccupazione: '80' }); carica() }
    setSaving(false)
  }

  const unitaDisponibili = form.strutturaId ? strutture.find(s => s.id === form.strutturaId)?.unita || [] : strutture.flatMap(s => s.unita || [])
  const r = report?.riepilogo

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2"><TrendingUp className="w-6 h-6 text-brand-500" /> {t('title')}</h1>
          <p className="text-sm text-gray-500">Upgrade camera con incentivi operatore e AI</p>
        </div>
        {tab === 'regole' && <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Nuova regola</button>}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('report')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'report' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>Report</button>
        <button onClick={() => setTab('regole')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'regole' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>Regole ({regole.length})</button>
      </div>

      {loading ? <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
        <>
          {/* TAB REPORT */}
          {tab === 'report' && r && (
            <>
              {/* Mese */}
              <div className="card flex items-center justify-between">
                <button onClick={() => { if (mese === 1) { setAnno(a => a - 1); setMese(12) } else setMese(m => m - 1) }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5" /></button>
                <p className="text-lg font-bold">{MESI[mese - 1]} {anno}</p>
                <button onClick={() => { if (mese === 12) { setAnno(a => a + 1); setMese(1) } else setMese(m => m + 1) }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronRight className="w-5 h-5" /></button>
              </div>

              {/* KPI */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card flex items-center gap-3"><Target className="w-8 h-8 text-blue-500" /><div><p className="text-xl font-extrabold">{r.totaleProposte}</p><p className="text-xs text-gray-500">Proposte</p></div></div>
                <div className="card flex items-center gap-3"><CheckCircle2 className="w-8 h-8 text-green-500" /><div><p className="text-xl font-extrabold text-green-600">{r.accettate}</p><p className="text-xs text-gray-500">Accettate ({r.conversionRate}%)</p></div></div>
                <div className="card flex items-center gap-3"><Euro className="w-8 h-8 text-brand-500" /><div><p className="text-xl font-extrabold text-brand-600">€{r.revenueGenerato.toFixed(0)}</p><p className="text-xs text-gray-500">Revenue extra</p></div></div>
                <div className="card flex items-center gap-3"><Award className="w-8 h-8 text-amber-500" /><div><p className="text-xl font-extrabold text-amber-600">€{r.incentiviTotali.toFixed(0)}</p><p className="text-xs text-gray-500">Incentivi pagati</p></div></div>
              </div>

              {/* Per operatore */}
              {report.perOperatore.length > 0 && (
                <div className="card">
                  <h2 className="text-base font-semibold mb-3">Classifica operatori</h2>
                  <div className="space-y-2">
                    {report.perOperatore.map((op, i) => (
                      <div key={op.operatore} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                        <span className="flex-1 text-sm font-medium">{op.operatore}</span>
                        <span className="text-xs text-gray-400">{op.accettate}/{op.proposte} ({op.proposte > 0 ? Math.round(op.accettate / op.proposte * 100) : 0}%)</span>
                        <span className="text-sm font-bold text-brand-600">€{op.revenue.toFixed(0)}</span>
                        <span className="text-xs text-amber-600">+€{op.incentivi.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ultime proposte */}
              {report.proposte.length > 0 && (
                <div className="card">
                  <h2 className="text-base font-semibold mb-3">Ultime proposte</h2>
                  <div className="space-y-2">
                    {report.proposte.slice(0, 15).map(p => (
                      <div key={p.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-50 dark:border-slate-800">
                        {p.stato === 'ACCETTATA' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                        <span className="font-medium">{p.prenotazione.guestCognome} {p.prenotazione.guestNome}</span>
                        <span className="text-gray-400">{p.daCameraNome} → {p.aCameraNome}</span>
                        <span className="font-bold text-brand-600">+€{p.supplementoTotale.toFixed(0)}</span>
                        <span className="text-gray-400 ml-auto">{p.propostaDa} · {format(new Date(p.createdAt), 'd MMM', { locale: it })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB REGOLE */}
          {tab === 'regole' && (
            <>
              {showForm && (
                <form onSubmit={addRegola} className="card border-brand-200 space-y-3">
                  <h3 className="text-sm font-semibold">Nuova regola upsell</h3>
                  <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Es: Standard → Deluxe" className={inp} required />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <select value={form.strutturaId} onChange={e => setForm(f => ({ ...f, strutturaId: e.target.value, daUnitaId: '', aUnitaId: '' }))} className={inp}>
                      <option value="">Tutte le strutture</option>
                      {strutture.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                    <select value={form.daUnitaId} onChange={e => setForm(f => ({ ...f, daUnitaId: e.target.value }))} className={inp}>
                      <option value="">Da: qualsiasi camera</option>
                      {unitaDisponibili.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                    <select value={form.aUnitaId} onChange={e => setForm(f => ({ ...f, aUnitaId: e.target.value }))} className={inp} required>
                      <option value="">A: seleziona camera *</option>
                      {unitaDisponibili.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">Supplemento</label>
                      <div className="flex gap-1">
                        <select value={form.tipoSupplemento} onChange={e => setForm(f => ({ ...f, tipoSupplemento: e.target.value }))} className={`w-20 ${inp}`}>
                          <option value="FISSO">€/notte</option>
                          <option value="PERCENTUALE">%</option>
                        </select>
                        <input type="number" step="0.01" value={form.supplemento} onChange={e => setForm(f => ({ ...f, supplemento: e.target.value }))} className={inp} placeholder="30" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Incentivo operatore €</label>
                      <input type="number" step="0.01" value={form.incentivo} onChange={e => setForm(f => ({ ...f, incentivo: e.target.value }))} className={inp} placeholder="5" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Max occupazione %</label>
                      <input type="number" value={form.maxOccupazione} onChange={e => setForm(f => ({ ...f, maxOccupazione: e.target.value }))} className={inp} placeholder="80" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crea regola
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Annulla</button>
                  </div>
                </form>
              )}

              {regole.length === 0 ? (
                <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
                  <TrendingUp className="w-10 h-10 opacity-30" /><p className="text-sm">Nessuna regola upsell configurata</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {regole.map(r => (
                    <div key={r.id} className={`card flex items-center gap-3 ${!r.attiva ? 'opacity-50' : ''}`}>
                      <TrendingUp className="w-5 h-5 text-brand-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{r.nome}</p>
                        <p className="text-xs text-gray-400">
                          +{r.tipoSupplemento === 'FISSO' ? `€${r.supplemento}` : `${r.supplemento}%`}/notte
                          · Incentivo €{r.incentivo}
                          {r.maxOccupazione ? ` · Max occ. ${r.maxOccupazione}%` : ''}
                          · {r._count.proposte} proposte
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
