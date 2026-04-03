'use client'

// TODO: i18n

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Plus, FileDown, Send, Eye, Trash2, RefreshCw, FileText,
  Search, Filter, X, ChevronDown, ChevronUp, Loader2,
  CheckCircle2, XCircle, Clock, AlertTriangle, Receipt,
  Building2, User, Calendar, Euro, Settings,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatValuta, formatData } from '@/lib/utils'
import ImpostazioniFatturazione from './impostazioni-fatturazione'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RigaFattura {
  descrizione: string
  quantita: number
  prezzoUnitario: number
  iva: number
  totale: number
}

interface Fattura {
  id: string
  numero: string
  anno: number
  stato: StatoFattura
  clienteNome: string
  clientePIva: string | null
  clienteCF: string | null
  clienteIndirizzo: string | null
  clienteCitta: string | null
  clienteCap: string | null
  clienteProvincia: string | null
  clientePaese: string
  clienteEmail: string | null
  clientePec: string | null
  clienteSDI: string | null
  righe: RigaFattura[]
  imponibile: number
  iva: number
  totale: number
  aliquotaIva: number
  dataEmissione: string
  dataScadenza: string | null
  note: string | null
  sdiId: string | null
  sdiStato: string | null
  sdiMessaggio: string | null
  sdiProvider: string | null
  sdiInviatoAt: string | null
  tipoDocumento: string | null
  riferimentoFatturaId: string | null
  prenotazioni: PrenotazioneRef[]
  createdAt: string
}

interface PrenotazioneRef {
  id: string
  guestNome: string
  guestCognome: string
  dataArrivo: string
  dataPartenza: string | null
  prezzoTotale: number | null
  numOspiti: number
  unita?: { nome: string } | null
  addebiti?: AddebitoRef[]
}

interface AddebitoRef {
  id: string
  descrizione: string
  quantita: number
  prezzoUnitario: number
  aliquotaIva: number
  totale: number
}

type StatoFattura = 'BOZZA' | 'INVIATA' | 'PAGATA' | 'SCADUTA' | 'ANNULLATA'
type StatoSDI = 'bozza' | 'inviata' | 'accettata' | 'scartata' | 'pagata' | 'scaduta'

type Tab = 'fatture' | 'impostazioni'

// ─── Constants ──────────────────────────────────────────────────────────────

const SDI_BADGE_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  bozza:     { label: 'Bozza',     className: 'bg-gray-100 text-gray-700',    icon: FileText },
  inviata:   { label: 'Inviata',   className: 'bg-blue-100 text-blue-800',    icon: Loader2 },
  accettata: { label: 'Accettata', className: 'bg-green-100 text-green-800',  icon: CheckCircle2 },
  scartata:  { label: 'Scartata',  className: 'bg-red-100 text-red-800',      icon: XCircle },
  pagata:    { label: 'Pagata',    className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  scaduta:   { label: 'Scaduta',   className: 'bg-amber-100 text-amber-800',  icon: AlertTriangle },
}

const ALIQUOTE_IVA = [0, 4, 5, 10, 22]

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSdiStatus(fattura: Fattura): string {
  if (fattura.stato === 'ANNULLATA') return 'bozza'
  if (fattura.stato === 'PAGATA') return 'pagata'
  if (fattura.stato === 'SCADUTA') return 'scaduta'
  return fattura.sdiStato || 'bozza'
}

function SdiBadge({ fattura }: { fattura: Fattura }) {
  const status = getSdiStatus(fattura)
  const config = SDI_BADGE_CONFIG[status] || SDI_BADGE_CONFIG.bozza
  const Icon = config.icon
  return (
    <Badge className={cn(config.className, 'inline-flex items-center gap-1')}>
      <Icon size={12} className={status === 'inviata' ? 'animate-spin' : ''} />
      {config.label}
    </Badge>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FattureEmesseManager() {
  const [fatture, setFatture] = useState<Fattura[]>([])
  const [prenotazioni, setPrenotazioni] = useState<PrenotazioneRef[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('fatture')
  const [search, setSearch] = useState('')
  const [filtroStato, setFiltroStato] = useState<string>('tutti')
  const [showNuova, setShowNuova] = useState(false)
  const [dettaglio, setDettaglio] = useState<Fattura | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ─── Data fetching ──────────────────────────────────────────────────────

  const loadFatture = useCallback(async () => {
    try {
      const res = await fetch('/api/host/fatture')
      if (res.ok) {
        const data = await res.json()
        setFatture(Array.isArray(data) ? data : data.fatture || [])
      }
    } catch (err) { console.error(err) 
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPrenotazioni = useCallback(async () => {
    try {
      const res = await fetch('/api/host/prenotazioni?stato=CONFERMATA&limit=50')
      if (res.ok) {
        const data = await res.json()
        setPrenotazioni(Array.isArray(data) ? data : data.prenotazioni || [])
      }
    } catch (err) { console.error(err) 
      // silent
    }
  }, [])

  useEffect(() => {
    loadFatture()
    loadPrenotazioni()
  }, [loadFatture, loadPrenotazioni])

  // ─── Filtered list ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = fatture
    if (filtroStato !== 'tutti') {
      list = list.filter(f => f.stato === filtroStato)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(f =>
        f.clienteNome.toLowerCase().includes(q) ||
        f.numero.toLowerCase().includes(q) ||
        (f.clientePIva && f.clientePIva.includes(q))
      )
    }
    return list
  }, [fatture, filtroStato, search])

  // ─── KPI ────────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const emesse = fatture.length
    const totFatturato = fatture
      .filter(f => f.stato !== 'ANNULLATA')
      .reduce((s, f) => s + f.totale, 0)
    const inAttesa = fatture.filter(f => f.sdiStato === 'in_attesa' || f.stato === 'INVIATA').length
    const scadute = fatture.filter(f => f.stato === 'SCADUTA').length
    return { emesse, totFatturato, inAttesa, scadute }
  }, [fatture])

  // ─── Actions ────────────────────────────────────────────────────────────

  const inviaSDI = async (id: string) => {
    if (!confirm('Inviare la fattura al Sistema di Interscambio?')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/host/fatture/${id}/invia-sdi`, { method: 'POST' })
      if (res.ok) {
        await loadFatture()
      } else {
        const data = await res.json()
        alert(data.error || 'Errore invio SDI')
      }
    } catch (err) { console.error(err) 
      alert('Errore di rete')
    } finally {
      setActionLoading(null)
    }
  }

  const verificaEsito = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/host/fatture/${id}/invia-sdi?verifica=1`)
      if (res.ok) {
        await loadFatture()
      }
    } catch (err) { console.error(err) 
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const eliminaFattura = async (id: string) => {
    if (!confirm('Eliminare questa fattura in bozza? L\'azione e irreversibile.')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/host/fatture/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setFatture(prev => prev.filter(f => f.id !== id))
        if (dettaglio?.id === id) setDettaglio(null)
      } else {
        const data = await res.json()
        alert(data.error || 'Errore eliminazione')
      }
    } catch (err) { console.error(err) 
      alert('Errore di rete')
    } finally {
      setActionLoading(null)
    }
  }

  const creaNota = async (fatturaId: string) => {
    if (!confirm('Creare una nota di credito per questa fattura?')) return
    setActionLoading(fatturaId)
    try {
      const res = await fetch('/api/host/fatture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'nota_credito', riferimentoFatturaId: fatturaId }),
      })
      if (res.ok) {
        await loadFatture()
      } else {
        const data = await res.json()
        alert(data.error || 'Errore creazione nota di credito')
      }
    } catch (err) { console.error(err) 
      alert('Errore di rete')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fatturazione Elettronica</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestisci le fatture emesse ai tuoi clienti e ospiti
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab('fatture')}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                tab === 'fatture' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Receipt size={14} className="inline mr-1.5 -mt-0.5" />
              Fatture
            </button>
            <button
              onClick={() => setTab('impostazioni')}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                tab === 'impostazioni' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Settings size={14} className="inline mr-1.5 -mt-0.5" />
              Impostazioni
            </button>
          </div>
          {tab === 'fatture' && (
            <button onClick={() => setShowNuova(true)} className="btn-primary">
              <Plus size={16} />
              Nuova fattura
            </button>
          )}
        </div>
      </div>

      {tab === 'impostazioni' ? (
        <ImpostazioniFatturazione />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Fatture emesse</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.emesse}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Totale fatturato</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatValuta(kpi.totFatturato)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">In attesa SDI</p>
              <p className={cn('text-2xl font-bold mt-1', kpi.inAttesa > 0 ? 'text-blue-600' : 'text-gray-900')}>
                {kpi.inAttesa}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Scadute</p>
              <p className={cn('text-2xl font-bold mt-1', kpi.scadute > 0 ? 'text-amber-600' : 'text-gray-900')}>
                {kpi.scadute}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per cliente, numero, P.IVA..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9 w-full"
              />
            </div>
            <select
              value={filtroStato}
              onChange={e => setFiltroStato(e.target.value)}
              className="input w-auto"
            >
              <option value="tutti">Tutti gli stati</option>
              <option value="BOZZA">Bozza</option>
              <option value="INVIATA">Inviata</option>
              <option value="PAGATA">Pagata</option>
              <option value="SCADUTA">Scaduta</option>
              <option value="ANNULLATA">Annullata</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="card p-12 text-center">
              <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Caricamento fatture...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-4">📄</p>
              <p className="text-lg font-semibold text-gray-700">
                {fatture.length === 0 ? 'Nessuna fattura emessa' : 'Nessun risultato'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {fatture.length === 0
                  ? 'Crea la tua prima fattura elettronica cliccando "Nuova fattura"'
                  : 'Prova a modificare i filtri di ricerca'}
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-th">Numero</th>
                      <th className="table-th">Data</th>
                      <th className="table-th">Cliente</th>
                      <th className="table-th text-right">Imponibile</th>
                      <th className="table-th text-right">IVA</th>
                      <th className="table-th text-right">Totale</th>
                      <th className="table-th text-center">Stato SDI</th>
                      <th className="table-th">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td font-mono font-semibold text-sm">
                          {f.tipoDocumento === 'TD04' && (
                            <span className="text-xs text-red-500 mr-1">NC</span>
                          )}
                          {f.numero}
                        </td>
                        <td className="table-td text-gray-500 text-sm">{formatData(f.dataEmissione)}</td>
                        <td className="table-td">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{f.clienteNome}</p>
                            {f.clientePIva && (
                              <p className="text-xs text-gray-400">P.IVA {f.clientePIva}</p>
                            )}
                          </div>
                        </td>
                        <td className="table-td text-right text-sm">{formatValuta(f.imponibile)}</td>
                        <td className="table-td text-right text-sm text-gray-500">{formatValuta(f.iva)}</td>
                        <td className="table-td text-right font-bold text-sm">{formatValuta(f.totale)}</td>
                        <td className="table-td text-center">
                          <SdiBadge fattura={f} />
                          {f.sdiMessaggio && f.sdiStato === 'scartata' && (
                            <p className="text-xs text-red-500 mt-1 max-w-[180px] truncate" title={f.sdiMessaggio}>
                              {f.sdiMessaggio}
                            </p>
                          )}
                        </td>
                        <td className="table-td">
                          <FatturaActions
                            fattura={f}
                            loading={actionLoading === f.id}
                            onView={() => setDettaglio(f)}
                            onInviaSDI={() => inviaSDI(f.id)}
                            onVerifica={() => verificaEsito(f.id)}
                            onNotaCredito={() => creaNota(f.id)}
                            onElimina={() => eliminaFattura(f.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Nuova fattura modal */}
      {showNuova && (
        <NuovaFatturaModal
          prenotazioni={prenotazioni}
          onClose={() => setShowNuova(false)}
          onCreated={() => { setShowNuova(false); loadFatture() }}
        />
      )}

      {/* Dettaglio modal */}
      {dettaglio && (
        <DettaglioFatturaModal
          fattura={dettaglio}
          onClose={() => setDettaglio(null)}
        />
      )}
    </div>
  )
}

// ─── Azioni fattura ─────────────────────────────────────────────────────────

function FatturaActions({
  fattura,
  loading,
  onView,
  onInviaSDI,
  onVerifica,
  onNotaCredito,
  onElimina,
}: {
  fattura: Fattura
  loading: boolean
  onView: () => void
  onInviaSDI: () => void
  onVerifica: () => void
  onNotaCredito: () => void
  onElimina: () => void
}) {
  const sdiStatus = getSdiStatus(fattura)
  const isBozza = fattura.stato === 'BOZZA'
  const isInviata = fattura.stato === 'INVIATA'
  const isAccettata = sdiStatus === 'accettata' || fattura.stato === 'PAGATA'

  if (loading) {
    return <Loader2 size={16} className="animate-spin text-gray-400" />
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onView}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="Visualizza dettaglio"
      >
        <Eye size={14} />
      </button>

      {/* Download XML */}
      <a
        href={`/api/host/fatture/${fattura.id}/xml`}
        target="_blank"
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="Scarica XML"
      >
        <FileDown size={14} />
      </a>

      {/* Download PDF */}
      <a
        href={`/api/host/fatture/${fattura.id}/pdf`}
        target="_blank"
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
        title="Scarica PDF"
      >
        <FileText size={14} />
      </a>

      {/* Bozza-specific actions */}
      {isBozza && (
        <>
          <button
            onClick={onInviaSDI}
            className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
            title="Invia a SDI"
          >
            <Send size={14} />
          </button>
          <button
            onClick={onElimina}
            className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            title="Elimina"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}

      {/* Inviata: verifica esito */}
      {isInviata && (
        <button
          onClick={onVerifica}
          className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
          title="Verifica esito SDI"
        >
          <RefreshCw size={14} />
        </button>
      )}

      {/* Accettata: nota di credito */}
      {isAccettata && !fattura.riferimentoFatturaId && (
        <button
          onClick={onNotaCredito}
          className="p-1.5 rounded hover:bg-amber-50 text-amber-500 hover:text-amber-700 transition-colors"
          title="Emetti nota di credito"
        >
          <Receipt size={14} />
        </button>
      )}
    </div>
  )
}

// ─── Dettaglio modal ────────────────────────────────────────────────────────

function DettaglioFatturaModal({ fattura, onClose }: { fattura: Fattura; onClose: () => void }) {
  const righe = Array.isArray(fattura.righe) ? fattura.righe : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {fattura.tipoDocumento === 'TD04' ? 'Nota di credito' : 'Fattura'} {fattura.numero}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Emessa il {formatData(fattura.dataEmissione)}
              {fattura.dataScadenza && <> &middot; Scadenza {formatData(fattura.dataScadenza)}</>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SdiBadge fattura={fattura} />
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Dati cliente */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <User size={14} /> Dati cliente
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium">{fattura.clienteNome}</p>
              {fattura.clientePIva && <p>P.IVA: {fattura.clientePIva}</p>}
              {fattura.clienteCF && <p>C.F.: {fattura.clienteCF}</p>}
              {fattura.clienteIndirizzo && (
                <p>{fattura.clienteIndirizzo}, {fattura.clienteCap} {fattura.clienteCitta} ({fattura.clienteProvincia})</p>
              )}
              {fattura.clientePec && <p>PEC: {fattura.clientePec}</p>}
              {fattura.clienteSDI && <p>Codice SDI: {fattura.clienteSDI}</p>}
            </div>
          </div>

          {/* Righe */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FileText size={14} /> Righe fattura
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-500">Descrizione</th>
                    <th className="text-right py-2 font-medium text-gray-500 w-16">Qta</th>
                    <th className="text-right py-2 font-medium text-gray-500 w-24">Prezzo</th>
                    <th className="text-right py-2 font-medium text-gray-500 w-16">IVA %</th>
                    <th className="text-right py-2 font-medium text-gray-500 w-24">Totale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {righe.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2">{r.descrizione}</td>
                      <td className="py-2 text-right">{r.quantita}</td>
                      <td className="py-2 text-right">{formatValuta(r.prezzoUnitario)}</td>
                      <td className="py-2 text-right">{r.iva}%</td>
                      <td className="py-2 text-right font-medium">{formatValuta(r.totale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totali */}
          <div className="border-t border-gray-200 pt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Imponibile</span>
              <span>{formatValuta(fattura.imponibile)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">IVA ({fattura.aliquotaIva}%)</span>
              <span>{formatValuta(fattura.iva)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
              <span>Totale</span>
              <span>{formatValuta(fattura.totale)}</span>
            </div>
          </div>

          {/* SDI info */}
          {fattura.sdiStato && fattura.sdiStato !== 'bozza' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Building2 size={14} /> Stato SDI
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                {fattura.sdiProvider && <p>Provider: <span className="font-medium capitalize">{fattura.sdiProvider}</span></p>}
                {fattura.sdiInviatoAt && <p>Inviata il: {formatData(fattura.sdiInviatoAt)}</p>}
                {fattura.sdiId && <p>ID SDI: <span className="font-mono text-xs">{fattura.sdiId}</span></p>}
                {fattura.sdiMessaggio && (
                  <p className={fattura.sdiStato === 'scartata' ? 'text-red-600' : ''}>
                    Messaggio: {fattura.sdiMessaggio}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Note */}
          {fattura.note && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Note</h3>
              <p className="text-sm text-gray-600">{fattura.note}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <a
            href={`/api/host/fatture/${fattura.id}/xml`}
            target="_blank"
            className="btn-secondary text-sm"
          >
            <FileDown size={14} /> Scarica XML
          </a>
          <a
            href={`/api/host/fatture/${fattura.id}/pdf`}
            target="_blank"
            className="btn-primary text-sm"
          >
            <FileText size={14} /> Scarica PDF
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Nuova fattura modal ────────────────────────────────────────────────────

type ModalitaCreazione = 'prenotazione' | 'manuale'

function NuovaFatturaModal({
  prenotazioni,
  onClose,
  onCreated,
}: {
  prenotazioni: PrenotazioneRef[]
  onClose: () => void
  onCreated: () => void
}) {
  const [modalita, setModalita] = useState<ModalitaCreazione>('manuale')
  const [prenotazioneId, setPrenotazioneId] = useState('')
  const [saving, setSaving] = useState(false)

  // Dati cliente
  const [clienteNome, setClienteNome] = useState('')
  const [clientePIva, setClientePIva] = useState('')
  const [clienteCF, setClienteCF] = useState('')
  const [clienteIndirizzo, setClienteIndirizzo] = useState('')
  const [clienteCitta, setClienteCitta] = useState('')
  const [clienteCap, setClienteCap] = useState('')
  const [clienteProvincia, setClienteProvincia] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [clientePec, setClientePec] = useState('')
  const [clienteSDI, setClienteSDI] = useState('0000000')

  // Righe
  const [righe, setRighe] = useState<RigaFattura[]>([
    { descrizione: '', quantita: 1, prezzoUnitario: 0, iva: 22, totale: 0 },
  ])

  // Metadata
  const [note, setNote] = useState('')
  const [dataEmissione, setDataEmissione] = useState(() => new Date().toISOString().slice(0, 10))
  const [dataScadenza, setDataScadenza] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [aliquotaIva, setAliquotaIva] = useState(22)

  // ─── Da prenotazione ──────────────────────────────────────────────────

  const onSelectPrenotazione = (id: string) => {
    setPrenotazioneId(id)
    const pren = prenotazioni.find(p => p.id === id)
    if (!pren) return

    setClienteNome(`${pren.guestNome} ${pren.guestCognome}`)

    // Build righe from prenotazione + addebiti
    const newRighe: RigaFattura[] = []

    // Soggiorno line
    if (pren.prezzoTotale) {
      const desc = pren.unita
        ? `Soggiorno ${pren.unita.nome} - ${formatData(pren.dataArrivo)} / ${formatData(pren.dataPartenza)}`
        : `Soggiorno ${formatData(pren.dataArrivo)} / ${formatData(pren.dataPartenza)}`
      newRighe.push({
        descrizione: desc,
        quantita: 1,
        prezzoUnitario: pren.prezzoTotale,
        iva: aliquotaIva,
        totale: pren.prezzoTotale,
      })
    }

    // Addebiti
    if (pren.addebiti) {
      for (const a of pren.addebiti) {
        newRighe.push({
          descrizione: a.descrizione,
          quantita: a.quantita,
          prezzoUnitario: a.prezzoUnitario,
          iva: a.aliquotaIva,
          totale: a.totale,
        })
      }
    }

    if (newRighe.length > 0) {
      setRighe(newRighe)
    }
  }

  // ─── Righe management ─────────────────────────────────────────────────

  const updateRiga = (index: number, field: keyof RigaFattura, value: string | number) => {
    setRighe(prev => prev.map((r, i) => {
      if (i !== index) return r
      const updated = { ...r, [field]: value }
      // Recalc totale
      updated.totale = updated.quantita * updated.prezzoUnitario
      return updated
    }))
  }

  const addRiga = () => {
    setRighe(prev => [...prev, { descrizione: '', quantita: 1, prezzoUnitario: 0, iva: aliquotaIva, totale: 0 }])
  }

  const removeRiga = (index: number) => {
    setRighe(prev => prev.filter((_, i) => i !== index))
  }

  // ─── Totals ───────────────────────────────────────────────────────────

  const totali = useMemo(() => {
    const imponibile = righe.reduce((s, r) => s + r.totale, 0)
    // Group by IVA rate for correct calculation
    const ivaPerAliquota: Record<number, number> = {}
    for (const r of righe) {
      const rate = r.iva || 0
      ivaPerAliquota[rate] = (ivaPerAliquota[rate] || 0) + (r.totale * rate / 100)
    }
    const iva = Object.values(ivaPerAliquota).reduce((s, v) => s + v, 0)
    return { imponibile, iva, totale: imponibile + iva }
  }, [righe])

  // ─── Submit ───────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!clienteNome.trim()) {
      alert('Inserire il nome del cliente')
      return
    }
    if (righe.length === 0 || righe.every(r => !r.descrizione.trim())) {
      alert('Inserire almeno una riga')
      return
    }

    setSaving(true)
    try {
      const body = {
        clienteNome: clienteNome.trim(),
        clientePIva: clientePIva.trim() || null,
        clienteCF: clienteCF.trim() || null,
        clienteIndirizzo: clienteIndirizzo.trim() || null,
        clienteCitta: clienteCitta.trim() || null,
        clienteCap: clienteCap.trim() || null,
        clienteProvincia: clienteProvincia.trim() || null,
        clienteEmail: clienteEmail.trim() || null,
        clientePec: clientePec.trim() || null,
        clienteSDI: clienteSDI.trim() || '0000000',
        righe: righe.filter(r => r.descrizione.trim()),
        imponibile: totali.imponibile,
        iva: totali.iva,
        totale: totali.totale,
        aliquotaIva,
        dataEmissione,
        dataScadenza: dataScadenza || null,
        note: note.trim() || null,
        prenotazioneIds: prenotazioneId ? [prenotazioneId] : [],
      }

      const res = await fetch('/api/host/fatture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json()
        alert(data.error || 'Errore nella creazione della fattura')
      }
    } catch (err) { console.error(err) 
      alert('Errore di rete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Nuova Fattura Elettronica</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Modalita selezione */}
          <div>
            <label className="label">Crea fattura da</label>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setModalita('prenotazione')}
                className={cn(
                  'flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors text-center',
                  modalita === 'prenotazione'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                <Calendar size={18} className="mx-auto mb-1" />
                Da prenotazione
              </button>
              <button
                onClick={() => setModalita('manuale')}
                className={cn(
                  'flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors text-center',
                  modalita === 'manuale'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                <FileText size={18} className="mx-auto mb-1" />
                Manuale
              </button>
            </div>
          </div>

          {/* Prenotazione selector */}
          {modalita === 'prenotazione' && (
            <div>
              <label className="label">Seleziona prenotazione</label>
              <select
                value={prenotazioneId}
                onChange={e => onSelectPrenotazione(e.target.value)}
                className="input w-full"
              >
                <option value="">-- Seleziona --</option>
                {prenotazioni.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.guestNome} {p.guestCognome} - {formatData(p.dataArrivo)}
                    {p.unita ? ` (${p.unita.nome})` : ''}
                    {p.prezzoTotale ? ` - ${formatValuta(p.prezzoTotale)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dati cliente */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <User size={14} /> Dati cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="label">Nome / Ragione sociale *</label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={e => setClienteNome(e.target.value)}
                  className="input w-full"
                  placeholder="Mario Rossi S.r.l."
                />
              </div>
              <div>
                <label className="label">Partita IVA</label>
                <input
                  type="text"
                  value={clientePIva}
                  onChange={e => setClientePIva(e.target.value)}
                  className="input w-full"
                  placeholder="IT12345678901"
                  maxLength={16}
                />
              </div>
              <div>
                <label className="label">Codice Fiscale</label>
                <input
                  type="text"
                  value={clienteCF}
                  onChange={e => setClienteCF(e.target.value.toUpperCase())}
                  className="input w-full"
                  placeholder="RSSMRA80A01H501U"
                  maxLength={16}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Indirizzo</label>
                <input
                  type="text"
                  value={clienteIndirizzo}
                  onChange={e => setClienteIndirizzo(e.target.value)}
                  className="input w-full"
                  placeholder="Via Roma 1"
                />
              </div>
              <div>
                <label className="label">Citta</label>
                <input
                  type="text"
                  value={clienteCitta}
                  onChange={e => setClienteCitta(e.target.value)}
                  className="input w-full"
                  placeholder="Roma"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">CAP</label>
                  <input
                    type="text"
                    value={clienteCap}
                    onChange={e => setClienteCap(e.target.value)}
                    className="input w-full"
                    placeholder="00100"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="label">Provincia</label>
                  <input
                    type="text"
                    value={clienteProvincia}
                    onChange={e => setClienteProvincia(e.target.value.toUpperCase())}
                    className="input w-full"
                    placeholder="RM"
                    maxLength={2}
                  />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={clienteEmail}
                  onChange={e => setClienteEmail(e.target.value)}
                  className="input w-full"
                  placeholder="mario@azienda.it"
                />
              </div>
              <div>
                <label className="label">PEC</label>
                <input
                  type="email"
                  value={clientePec}
                  onChange={e => setClientePec(e.target.value)}
                  className="input w-full"
                  placeholder="azienda@pec.it"
                />
              </div>
              <div>
                <label className="label">Codice SDI</label>
                <input
                  type="text"
                  value={clienteSDI}
                  onChange={e => setClienteSDI(e.target.value.toUpperCase())}
                  className="input w-full"
                  placeholder="0000000"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Righe fattura */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Euro size={14} /> Righe fattura
              </h3>
              <button onClick={addRiga} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                <Plus size={14} className="inline -mt-0.5 mr-0.5" />
                Aggiungi riga
              </button>
            </div>

            <div className="space-y-3">
              {righe.map((riga, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={riga.descrizione}
                      onChange={e => updateRiga(i, 'descrizione', e.target.value)}
                      className="input w-full text-sm"
                      placeholder="Descrizione"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      value={riga.quantita}
                      onChange={e => updateRiga(i, 'quantita', parseInt(e.target.value) || 0)}
                      className="input w-full text-sm text-center"
                      min={1}
                      placeholder="Qta"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      value={riga.prezzoUnitario || ''}
                      onChange={e => updateRiga(i, 'prezzoUnitario', parseFloat(e.target.value) || 0)}
                      className="input w-full text-sm text-right"
                      step="0.01"
                      min={0}
                      placeholder="Prezzo"
                    />
                  </div>
                  <div className="w-20">
                    <select
                      value={riga.iva}
                      onChange={e => updateRiga(i, 'iva', parseInt(e.target.value))}
                      className="input w-full text-sm"
                    >
                      {ALIQUOTE_IVA.map(a => (
                        <option key={a} value={a}>{a}%</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 text-right text-sm font-medium pt-2">
                    {formatValuta(riga.totale)}
                  </div>
                  <button
                    onClick={() => removeRiga(i)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    disabled={righe.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Totali */}
            <div className="mt-4 border-t border-gray-200 pt-4 space-y-1 text-sm">
              <div className="flex justify-end gap-8">
                <span className="text-gray-500">Imponibile</span>
                <span className="w-28 text-right font-medium">{formatValuta(totali.imponibile)}</span>
              </div>
              <div className="flex justify-end gap-8">
                <span className="text-gray-500">IVA</span>
                <span className="w-28 text-right">{formatValuta(totali.iva)}</span>
              </div>
              <div className="flex justify-end gap-8 text-base font-bold pt-2 border-t border-gray-200">
                <span>Totale</span>
                <span className="w-28 text-right">{formatValuta(totali.totale)}</span>
              </div>
            </div>
          </div>

          {/* Date e note */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Data emissione</label>
              <input
                type="date"
                value={dataEmissione}
                onChange={e => setDataEmissione(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Data scadenza</label>
              <input
                type="date"
                value={dataScadenza}
                onChange={e => setDataScadenza(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Aliquota IVA default</label>
              <select
                value={aliquotaIva}
                onChange={e => setAliquotaIva(parseInt(e.target.value))}
                className="input w-full"
              >
                {ALIQUOTE_IVA.map(a => (
                  <option key={a} value={a}>{a}%</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="label">Note</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="input w-full"
                rows={2}
                placeholder="Note aggiuntive (opzionale)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Plus size={16} />
                Crea fattura (bozza)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
