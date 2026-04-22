'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  CreditCard, TrendingUp, Users, Package, Download, Loader2,
  Plus, ChevronRight, AlertCircle, CheckCircle2, Clock, XCircle,
  Search, X,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type BillingData = {
  kpi: {
    mrr: number
    arr: number
    arpu: number
    hostTotali: number
    hostAttivi: number
    addonRevenueMensile: number
  }
  perPiano: { piano: string; nome: string; count: number; mrr: number; prezzoMensile: number }[]
  addonRows: { moduloId: string; nome: string; hostCount: number; prezzo: number; revenue: number }[]
  abbonamenti: {
    id: string; hostId: string; hostNome: string; hostEmail: string
    piano: string; stato: string
    dataInizio: string; dataFine: string | null; prezzoMensile: number
  }[]
}

type Pagamento = {
  id: string
  hostId: string; hostNome: string; hostEmail: string; piano: string
  importo: number; valuta: string; metodo: string; stato: string
  riferimento: string | null; note: string | null
  periodoInizio: string; periodoFine: string
  createdAt: string
}

const STATO_CLS: Record<string, string> = {
  ATTIVO: 'bg-green-50 text-green-700',
  IN_PROVA: 'bg-blue-50 text-blue-700',
  SCADUTO: 'bg-orange-50 text-orange-700',
  SOSPESO: 'bg-gray-100 text-gray-600',
}

const PAG_STATO_CLS: Record<string, string> = {
  PAGATO: 'bg-green-50 text-green-700',
  PENDENTE: 'bg-amber-50 text-amber-700',
  FALLITO: 'bg-red-50 text-red-700',
  RIMBORSATO: 'bg-gray-100 text-gray-600',
}

const PIANO_COLOR = ['#94a3b8', '#3b82f6', '#8b5cf6', '#f59e0b']

// ─── Componente ───────────────────────────────────────────────────────────────

export default function BillingDashboard() {
  const [data, setData] = useState<BillingData | null>(null)
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([])
  const [totalePagato, setTotalePagato] = useState(0)
  const [loading, setLoading] = useState(true)
  const [meseFilter, setMeseFilter] = useState<string>(new Date().toISOString().slice(0, 7))
  const [statoPagFilter, setStatoPagFilter] = useState('')
  const [showAddPayment, setShowAddPayment] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [d, p] = await Promise.all([
      fetch('/api/admin/billing').then((r) => r.json()),
      fetch(`/api/admin/billing/pagamenti?mese=${meseFilter}${statoPagFilter ? `&stato=${statoPagFilter}` : ''}`).then((r) => r.json()),
    ])
    setData(d)
    setPagamenti(p.pagamenti ?? [])
    setTotalePagato(p.totale?.importoPagato ?? 0)
    setLoading(false)
  }, [meseFilter, statoPagFilter])

  useEffect(() => { load() }, [load])

  function exportCsv() {
    const sp = new URLSearchParams()
    if (meseFilter) sp.set('mese', meseFilter)
    if (statoPagFilter) sp.set('stato', statoPagFilter)
    window.location.href = `/api/admin/billing/export?${sp}`
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!data) return null

  const { kpi, perPiano, addonRows, abbonamenti } = data

  return (
    <div className="space-y-6">
      {/* ═══ KPI ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={<CreditCard />} color="blue" label="MRR" value={`€${kpi.mrr.toLocaleString('it-IT')}`} sub="Monthly Recurring Revenue" />
        <KpiCard icon={<TrendingUp />} color="emerald" label="ARR" value={`€${kpi.arr.toLocaleString('it-IT')}`} sub="MRR × 12" />
        <KpiCard icon={<Users />} color="violet" label="ARPU" value={`€${kpi.arpu.toFixed(2)}`} sub={`MRR / ${kpi.hostAttivi} attivi`} />
        <KpiCard icon={<Package />} color="amber" label="Add-on revenue" value={`€${kpi.addonRevenueMensile.toLocaleString('it-IT')}`} sub="stimato/mese" />
      </div>

      {/* ═══ Grafico per piano ═════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-3">Host per piano</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perPiano} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="nome" stroke="#94a3b8" fontSize={11} width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {perPiano.map((_, idx) => <Cell key={idx} fill={PIANO_COLOR[idx % PIANO_COLOR.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">
            {perPiano.map((p) => (
              <div key={p.piano} className="text-center">
                <p className="text-[10px] font-bold text-gray-500 uppercase">{p.nome}</p>
                <p className="text-lg font-extrabold text-gray-900">{p.count}</p>
                <p className="text-xs text-gray-500">€{p.mrr}/mese</p>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue per modulo */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-3">Revenue add-on per modulo</h2>
          {addonRows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nessun modulo add-on attivo</p>
          ) : (
            <div className="space-y-1.5">
              {addonRows.slice(0, 10).map((m) => {
                const maxRev = Math.max(...addonRows.map((r) => r.revenue), 1)
                const pct = (m.revenue / maxRev) * 100
                return (
                  <div key={m.moduloId} className="flex items-center gap-3">
                    <p className="text-xs text-gray-700 w-32 shrink-0 truncate">{m.nome}</p>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs font-semibold text-gray-700 w-20 text-right shrink-0">
                      €{m.revenue}
                    </p>
                    <p className="text-[10px] text-gray-400 w-12 text-right shrink-0">
                      {m.hostCount} host
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Abbonamenti attivi ═══════════════════════════════════════════ */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Abbonamenti ({abbonamenti.length})</h2>
          <Link href="/admin/host" className="text-xs text-brand-600 font-medium hover:underline">
            Gestisci host →
          </Link>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 sticky top-0">
              <tr>
                <th className="table-th">Host</th>
                <th className="table-th">Piano</th>
                <th className="table-th">€/mese</th>
                <th className="table-th">Stato</th>
                <th className="table-th hidden md:table-cell">Inizio</th>
                <th className="table-th hidden md:table-cell">Scadenza</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {abbonamenti.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">Nessun abbonamento</td></tr>
              ) : abbonamenti.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="table-td">
                    <p className="font-semibold text-gray-900 truncate max-w-xs">{a.hostNome}</p>
                    <p className="text-xs text-gray-500 truncate">{a.hostEmail}</p>
                  </td>
                  <td className="table-td text-xs font-semibold text-gray-700">{a.piano}</td>
                  <td className="table-td font-semibold">€{a.prezzoMensile}</td>
                  <td className="table-td">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATO_CLS[a.stato] ?? STATO_CLS.SOSPESO}`}>
                      {a.stato}
                    </span>
                  </td>
                  <td className="table-td hidden md:table-cell text-xs text-gray-500">
                    {format(new Date(a.dataInizio), 'd MMM yyyy', { locale: it })}
                  </td>
                  <td className="table-td hidden md:table-cell text-xs text-gray-500">
                    {a.dataFine ? format(new Date(a.dataFine), 'd MMM yyyy', { locale: it }) : '—'}
                  </td>
                  <td className="table-td">
                    <Link
                      href={`/admin/host/${a.hostId}`}
                      className="p-1.5 rounded text-gray-400 hover:text-brand-500 hover:bg-brand-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Movimenti (pagamenti piattaforma) ═════════════════════════════ */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Movimenti</h2>
            <p className="text-xs text-gray-500">
              {pagamenti.length} pagamenti · Totale PAGATO: <strong>€{totalePagato.toFixed(2)}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={meseFilter}
              onChange={(e) => setMeseFilter(e.target.value)}
              className="px-3 py-1.5 rounded border border-gray-200 text-sm"
            />
            <select
              value={statoPagFilter}
              onChange={(e) => setStatoPagFilter(e.target.value)}
              className="px-3 py-1.5 rounded border border-gray-200 bg-white text-sm font-medium"
            >
              <option value="">Tutti gli stati</option>
              <option value="PAGATO">Pagato</option>
              <option value="PENDENTE">Pendente</option>
              <option value="FALLITO">Fallito</option>
              <option value="RIMBORSATO">Rimborsato</option>
            </select>
            <button onClick={exportCsv} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => setShowAddPayment(true)} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> Nuovo pagamento
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 sticky top-0">
              <tr>
                <th className="table-th">Data</th>
                <th className="table-th">Host</th>
                <th className="table-th">Importo</th>
                <th className="table-th hidden md:table-cell">Metodo</th>
                <th className="table-th">Stato</th>
                <th className="table-th hidden md:table-cell">Periodo</th>
                <th className="table-th hidden lg:table-cell">Riferimento</th>
              </tr>
            </thead>
            <tbody>
              {pagamenti.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">
                  Nessun pagamento per i filtri selezionati
                </td></tr>
              ) : pagamenti.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="table-td text-xs text-gray-500">
                    {format(new Date(p.createdAt), 'd MMM', { locale: it })}
                  </td>
                  <td className="table-td">
                    <p className="font-semibold text-gray-900 truncate max-w-[180px]">{p.hostNome}</p>
                    <p className="text-[11px] text-gray-400 truncate">{p.hostEmail}</p>
                  </td>
                  <td className="table-td font-bold">€{p.importo.toFixed(2)}</td>
                  <td className="table-td hidden md:table-cell">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                      {p.metodo}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PAG_STATO_CLS[p.stato] ?? 'bg-gray-100 text-gray-500'}`}>
                      {p.stato}
                    </span>
                  </td>
                  <td className="table-td hidden md:table-cell text-xs text-gray-500">
                    {format(new Date(p.periodoInizio), 'd MMM', { locale: it })} → {format(new Date(p.periodoFine), 'd MMM', { locale: it })}
                  </td>
                  <td className="table-td hidden lg:table-cell text-xs text-gray-500 font-mono truncate max-w-[150px]">
                    {p.riferimento ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddPayment && (
        <AddPaymentModal
          onClose={() => setShowAddPayment(false)}
          onSaved={() => { setShowAddPayment(false); load() }}
        />
      )}
    </div>
  )
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon, color, label, value, sub,
}: {
  icon: React.ReactNode; color: 'blue' | 'emerald' | 'violet' | 'amber'
  label: string; value: string; sub?: string
}) {
  const cm = {
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-600',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-600',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-600',
  }
  return (
    <div className="card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cm[color]} ring-1 ring-inset ring-black/5`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Modal nuovo pagamento ──────────────────────────────────────────────────

function AddPaymentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [hosts, setHosts] = useState<{ id: string; nomeAzienda: string; piano: string }[]>([])
  const [hostId, setHostId] = useState('')
  const [importo, setImporto] = useState('')
  const [metodo, setMetodo] = useState('MANUALE')
  const [stato, setStato] = useState('PAGATO')
  const [riferimento, setRiferimento] = useState('')
  const [note, setNote] = useState('')
  const [periodoInizio, setPeriodoInizio] = useState(new Date().toISOString().slice(0, 10))
  const [periodoFine, setPeriodoFine] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
  )
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    fetch('/api/admin/host?limit=100')
      .then((r) => r.json())
      .then((d) => setHosts(d.hosts ?? []))
  }, [])

  async function salva() {
    if (!hostId || !importo) { setErrore('Host e importo obbligatori'); return }
    setSaving(true); setErrore('')
    const res = await fetch('/api/admin/billing/pagamenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostId,
        importo: parseFloat(importo),
        metodo, stato,
        riferimento: riferimento || null,
        note: note || null,
        periodoInizio, periodoFine,
      }),
    })
    if (res.ok) onSaved()
    else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Nuovo pagamento</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">Host *</label>
            <select value={hostId} onChange={(e) => setHostId(e.target.value)} className="input">
              <option value="">— seleziona —</option>
              {hosts.map((h) => <option key={h.id} value={h.id}>{h.nomeAzienda} ({h.piano})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Importo € *</label>
              <input type="number" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Metodo</label>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="input">
                <option value="MANUALE">Manuale</option>
                <option value="BONIFICO">Bonifico</option>
                <option value="STRIPE">Stripe</option>
                <option value="CARTA">Carta</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Stato</label>
              <select value={stato} onChange={(e) => setStato(e.target.value)} className="input">
                <option value="PAGATO">Pagato</option>
                <option value="PENDENTE">Pendente</option>
                <option value="FALLITO">Fallito</option>
                <option value="RIMBORSATO">Rimborsato</option>
              </select>
            </div>
            <div>
              <label className="label">Riferimento</label>
              <input type="text" value={riferimento} onChange={(e) => setRiferimento(e.target.value)} className="input" placeholder="CRO, transaction ID..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Periodo inizio *</label>
              <input type="date" value={periodoInizio} onChange={(e) => setPeriodoInizio(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Periodo fine *</label>
              <input type="date" value={periodoFine} onChange={(e) => setPeriodoFine(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="input" />
          </div>
          {errore && <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errore}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={salva} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Registra
            </button>
            <button onClick={onClose} className="btn-secondary">Annulla</button>
          </div>
        </div>
      </div>
    </div>
  )
}
