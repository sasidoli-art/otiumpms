'use client'



import { useEffect, useState, useCallback } from 'react'
import {
  Gift, Plus, Search, X, CreditCard, RefreshCw, Ban,
  ChevronRight, Clock, Euro, Eye, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { cn, formatValuta, formatData } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GiftCard {
  id: string
  codice: string
  tipo: 'IMPORTO' | 'TRATTAMENTO'
  valoreOriginale: number
  saldo: number
  acquirenteNome: string
  acquirenteEmail: string
  destinatarioNome: string | null
  destinatarioEmail: string | null
  messaggio: string | null
  stato: string
  scadenza: string | null
  createdAt: string
  trattamento?: { id: string; nome: string; prezzo: number } | null
  movimenti?: Movimento[]
  _count?: { movimenti: number }
}

interface Movimento {
  id: string
  tipo: string
  importo: number
  saldoDopo: number
  descrizione: string | null
  createdAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATO_COLORS: Record<string, string> = {
  ATTIVA: 'green',
  SOSPESA: 'yellow',
  ESAURITA: 'gray',
  SCADUTA: 'red',
  ANNULLATA: 'red',
}
const STATO_LABEL: Record<string, string> = {
  ATTIVA: 'Attiva',
  SOSPESA: 'Sospesa',
  ESAURITA: 'Esaurita',
  SCADUTA: 'Scaduta',
  ANNULLATA: 'Annullata',
}
const TIPO_MOV_LABEL: Record<string, string> = {
  EMISSIONE: 'Emissione',
  UTILIZZO: 'Utilizzo',
  RICARICA: 'Ricarica',
  RIMBORSO: 'Rimborso',
  ANNULLAMENTO: 'Annullamento',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GiftCardManager() {
  const [cards, setCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [detail, setDetail] = useState<GiftCard | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ricaricaAmount, setRicaricaAmount] = useState('')

  const [form, setForm] = useState({
    tipo: 'IMPORTO' as 'IMPORTO' | 'TRATTAMENTO',
    valore: '',
    acquirenteNome: '',
    acquirenteEmail: '',
    destinatarioNome: '',
    destinatarioEmail: '',
    messaggio: '',
    scadenza: '',
  })

  // ─── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStato) params.set('stato', filterStato)
    if (searchTerm) params.set('search', searchTerm)
    const res = await fetch(`/api/host/spa/gift-card?${params}`)
    const data = await res.json()
    setCards(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [filterStato, searchTerm])

  useEffect(() => { load() }, [load])

  const loadDetail = async (id: string) => {
    setDetailLoading(true)
    const res = await fetch(`/api/host/spa/gift-card/${id}`)
    if (res.ok) {
      setDetail(await res.json())
    }
    setDetailLoading(false)
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const createCard = async () => {
    if (!form.valore || !form.acquirenteNome || !form.acquirenteEmail) return
    setSaving(true)
    const res = await fetch('/api/host/spa/gift-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        valore: Number(form.valore),
        scadenza: form.scadenza || null,
        destinatarioEmail: form.destinatarioEmail || null,
        destinatarioNome: form.destinatarioNome || null,
        messaggio: form.messaggio || null,
      }),
    })
    if (res.ok) {
      setShowCreate(false)
      resetForm()
      load()
    }
    setSaving(false)
  }

  const ricaricaCard = async () => {
    if (!detail || !ricaricaAmount) return
    setSaving(true)
    const res = await fetch(`/api/host/spa/gift-card/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ricarica: Number(ricaricaAmount) }),
    })
    if (res.ok) {
      setRicaricaAmount('')
      loadDetail(detail.id)
      load()
    }
    setSaving(false)
  }

  const annullaCard = async () => {
    if (!detail || !confirm('Annullare questa gift card? L\'operazione non e\' reversibile.')) return
    setSaving(true)
    const res = await fetch(`/api/host/spa/gift-card/${detail.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDetail(null)
      load()
    }
    setSaving(false)
  }

  const resetForm = () => {
    setForm({ tipo: 'IMPORTO', valore: '', acquirenteNome: '', acquirenteEmail: '', destinatarioNome: '', destinatarioEmail: '', messaggio: '', scadenza: '' })
  }

  // ─── KPI calculations ───────────────────────────────────────────────────────

  const totaleEmesse = cards.length
  const saldoTotale = cards.filter(c => c.stato === 'ATTIVA').reduce((s, c) => s + c.saldo, 0)
  const utilizzate = cards.filter(c => c.stato === 'ESAURITA').length
  const scadute = cards.filter(c => c.stato === 'SCADUTA').length

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-7 h-7 text-brand-500" />
            Gift Card
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci le gift card della tua SPA</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuova Gift Card
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard titolo="Totale emesse" valore={totaleEmesse} icona={<Gift className="w-8 h-8" />} colorIcona="text-brand-500" />
        <StatCard titolo="Saldo totale attivo" valore={formatValuta(saldoTotale)} icona={<Euro className="w-8 h-8" />} colorIcona="text-green-500" />
        <StatCard titolo="Utilizzate" valore={utilizzate} icona={<CreditCard className="w-8 h-8" />} colorIcona="text-blue-500" />
        <StatCard titolo="Scadute" valore={scadute} icona={<Clock className="w-8 h-8" />} colorIcona="text-red-500" />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per codice, nome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <select value={filterStato} onChange={e => setFilterStato(e.target.value)} className="input w-full sm:w-48">
            <option value="">Tutti gli stati</option>
            <option value="ATTIVA">Attiva</option>
            <option value="SOSPESA">Sospesa</option>
            <option value="ESAURITA">Esaurita</option>
            <option value="SCADUTA">Scaduta</option>
            <option value="ANNULLATA">Annullata</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Caricamento...</div>
        ) : cards.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nessuna gift card trovata</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Tipo</th>
                  <th>Valore</th>
                  <th>Saldo</th>
                  <th>Acquirente</th>
                  <th>Destinatario</th>
                  <th>Stato</th>
                  <th>Scadenza</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cards.map(card => (
                  <tr key={card.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => loadDetail(card.id)}>
                    <td className="font-mono font-semibold text-sm">{card.codice}</td>
                    <td>
                      <Badge variant={card.tipo === 'IMPORTO' ? 'blue' : 'purple'}>
                        {card.tipo === 'IMPORTO' ? 'Importo' : 'Trattamento'}
                      </Badge>
                    </td>
                    <td className="font-semibold">{formatValuta(card.valoreOriginale)}</td>
                    <td className={cn('font-semibold', card.saldo <= 0 ? 'text-gray-400' : 'text-green-600')}>
                      {formatValuta(card.saldo)}
                    </td>
                    <td className="text-sm">{card.acquirenteNome}</td>
                    <td className="text-sm text-gray-500">{card.destinatarioNome || '—'}</td>
                    <td>
                      <Badge variant={(STATO_COLORS[card.stato] || 'gray') as 'green' | 'yellow' | 'red' | 'gray'}>
                        {STATO_LABEL[card.stato] || card.stato}
                      </Badge>
                    </td>
                    <td className="text-sm text-gray-500">{formatData(card.scadenza)}</td>
                    <td>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Create Modal ─────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Nuova Gift Card</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div>
                <label className="label">Tipo</label>
                <div className="flex gap-2">
                  {(['IMPORTO', 'TRATTAMENTO'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, tipo: t })}
                      className={cn('flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors',
                        form.tipo === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {t === 'IMPORTO' ? 'Importo libero' : 'Trattamento specifico'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valore */}
              <div>
                <label className="label">Valore (EUR)</label>
                <input type="number" min="1" step="0.01" value={form.valore} onChange={e => setForm({ ...form, valore: e.target.value })} className="input w-full" placeholder="100.00" />
              </div>

              {/* Acquirente */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome acquirente *</label>
                  <input type="text" value={form.acquirenteNome} onChange={e => setForm({ ...form, acquirenteNome: e.target.value })} className="input w-full" />
                </div>
                <div>
                  <label className="label">Email acquirente *</label>
                  <input type="email" value={form.acquirenteEmail} onChange={e => setForm({ ...form, acquirenteEmail: e.target.value })} className="input w-full" />
                </div>
              </div>

              {/* Destinatario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome destinatario</label>
                  <input type="text" value={form.destinatarioNome} onChange={e => setForm({ ...form, destinatarioNome: e.target.value })} className="input w-full" placeholder="Opzionale" />
                </div>
                <div>
                  <label className="label">Email destinatario</label>
                  <input type="email" value={form.destinatarioEmail} onChange={e => setForm({ ...form, destinatarioEmail: e.target.value })} className="input w-full" placeholder="Opzionale" />
                </div>
              </div>

              {/* Messaggio */}
              <div>
                <label className="label">Messaggio regalo</label>
                <textarea value={form.messaggio} onChange={e => setForm({ ...form, messaggio: e.target.value })} className="input w-full" rows={2} placeholder="Un messaggio personalizzato..." />
              </div>

              {/* Scadenza */}
              <div>
                <label className="label">Scadenza</label>
                <input type="date" value={form.scadenza} onChange={e => setForm({ ...form, scadenza: e.target.value })} className="input w-full" />
                <p className="text-xs text-gray-400 mt-1">Se vuoto, scadenza automatica 1 anno</p>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost">Annulla</button>
              <button
                onClick={createCard}
                disabled={saving || !form.valore || !form.acquirenteNome || !form.acquirenteEmail}
                className="btn btn-primary flex items-center gap-2"
              >
                {saving ? 'Creazione...' : <><Gift className="w-4 h-4" /> Crea Gift Card</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Slide-out ─────────────────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white w-full max-w-xl shadow-2xl h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <div className="p-12 text-center text-gray-400">Caricamento...</div>
            ) : (
              <>
                {/* Detail Header */}
                <div className="p-6 border-b bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Dettaglio Gift Card</h2>
                    <button onClick={() => setDetail(null)} className="p-1 hover:bg-gray-200 rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl p-6 text-white">
                    <p className="text-sm opacity-80">Codice</p>
                    <p className="text-2xl font-mono font-bold tracking-wider mb-4">{detail.codice}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm opacity-80">Saldo disponibile</p>
                        <p className="text-3xl font-bold">{formatValuta(detail.saldo)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-80">Valore originale</p>
                        <p className="text-lg">{formatValuta(detail.valoreOriginale)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-6 border-b space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Stato</span>
                    <Badge variant={(STATO_COLORS[detail.stato] || 'gray') as 'green' | 'yellow' | 'red' | 'gray'}>
                      {STATO_LABEL[detail.stato] || detail.stato}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tipo</span>
                    <span>{detail.tipo === 'IMPORTO' ? 'Importo libero' : 'Trattamento'}</span>
                  </div>
                  {detail.trattamento && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Trattamento</span>
                      <span>{detail.trattamento.nome}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Acquirente</span>
                    <span>{detail.acquirenteNome}</span>
                  </div>
                  {detail.destinatarioNome && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Destinatario</span>
                      <span>{detail.destinatarioNome}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Scadenza</span>
                    <span>{formatData(detail.scadenza)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Data emissione</span>
                    <span>{formatData(detail.createdAt)}</span>
                  </div>
                  {detail.messaggio && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                      <p className="text-xs text-yellow-600 font-semibold mb-1">Messaggio regalo</p>
                      <p className="text-sm text-gray-700 italic">&ldquo;{detail.messaggio}&rdquo;</p>
                    </div>
                  )}
                </div>

                {/* Actions: Ricarica & Annulla */}
                {detail.stato === 'ATTIVA' && (
                  <div className="p-6 border-b space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Azioni</h3>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Importo ricarica"
                        value={ricaricaAmount}
                        onChange={e => setRicaricaAmount(e.target.value)}
                        className="input flex-1"
                      />
                      <button
                        onClick={ricaricaCard}
                        disabled={saving || !ricaricaAmount}
                        className="btn btn-primary flex items-center gap-1 text-sm"
                      >
                        <RefreshCw className="w-4 h-4" /> Ricarica
                      </button>
                    </div>
                    <button
                      onClick={annullaCard}
                      disabled={saving}
                      className="btn btn-ghost text-red-600 hover:bg-red-50 w-full flex items-center justify-center gap-2"
                    >
                      <Ban className="w-4 h-4" /> Annulla Gift Card
                    </button>
                  </div>
                )}

                {/* Movimenti */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Movimenti ({detail.movimenti?.length || 0})
                  </h3>
                  {!detail.movimenti?.length ? (
                    <p className="text-sm text-gray-400">Nessun movimento</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.movimenti.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                            m.importo >= 0 ? 'bg-green-100' : 'bg-red-100'
                          )}>
                            {m.importo >= 0
                              ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                              : <ArrowDownRight className="w-4 h-4 text-red-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              {TIPO_MOV_LABEL[m.tipo] || m.tipo}
                            </p>
                            {m.descrizione && (
                              <p className="text-xs text-gray-500 truncate">{m.descrizione}</p>
                            )}
                            <p className="text-xs text-gray-400">{formatData(m.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn('text-sm font-semibold', m.importo >= 0 ? 'text-green-600' : 'text-red-600')}>
                              {m.importo >= 0 ? '+' : ''}{formatValuta(m.importo)}
                            </p>
                            <p className="text-xs text-gray-400">Saldo: {formatValuta(m.saldoDopo)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
