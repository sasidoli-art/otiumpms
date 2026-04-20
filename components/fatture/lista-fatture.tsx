'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Plus, Download, FileDown, FileCode, Search, X, Loader2,
  CheckCircle2, Clock, AlertCircle, Ban, Undo2, ChevronRight,
  Send, ArrowUpDown,
} from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type StatoFattura = 'BOZZA' | 'INVIATA' | 'PAGATA' | 'SCADUTA' | 'ANNULLATA' | 'STORNATA'

type Fattura = {
  id: string
  numero: string
  anno: number
  stato: StatoFattura
  tipoDocumento: string | null
  dataEmissione: string
  dataScadenza: string | null
  clienteNome: string
  clientePIva: string | null
  imponibile: number
  iva: number
  totale: number
  sdiStato: string | null
  sdiProvider: string | null
  sdiInviatoAt: string | null
  riferimentoFatturaId: string | null
}

const STATO_BADGE: Record<StatoFattura, { label: string; cls: string }> = {
  BOZZA:     { label: 'Bozza',      cls: 'bg-gray-100 text-gray-600' },
  INVIATA:   { label: 'Inviata',    cls: 'bg-blue-50 text-blue-700' },
  PAGATA:    { label: 'Pagata',     cls: 'bg-green-50 text-green-700' },
  SCADUTA:   { label: 'Scaduta',    cls: 'bg-red-50 text-red-700' },
  ANNULLATA: { label: 'Annullata',  cls: 'bg-gray-900 text-white' },
  STORNATA:  { label: 'Stornata',   cls: 'bg-violet-50 text-violet-700' },
}

const SDI_BADGE: Record<string, { label: string; cls: string }> = {
  da_inviare: { label: 'Da inviare',   cls: 'bg-gray-100 text-gray-600' },
  in_attesa:  { label: 'In attesa',    cls: 'bg-yellow-50 text-yellow-700' },
  accettata:  { label: 'Accettata',    cls: 'bg-green-50 text-green-700' },
  scartata:   { label: 'Scartata',     cls: 'bg-red-50 text-red-700' },
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ListaFatture({
  anniDisponibili,
  annoDefault,
}: {
  anniDisponibili: number[]
  annoDefault: number
}) {
  const [fatture, setFatture] = useState<Fattura[]>([])
  const [loading, setLoading] = useState(false)
  const [totale, setTotale] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [q, setQ] = useState('')
  const [anno, setAnno] = useState<number | ''>(annoDefault)
  const [stato, setStato] = useState<StatoFattura | ''>('')
  const [azione, setAzione] = useState<{ id: string; tipo: string } | null>(null)
  const [errore, setErrore] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cerca = useCallback(async (p = 1) => {
    setLoading(true)
    const sp = new URLSearchParams({ page: String(p), limit: '50' })
    if (anno) sp.set('anno', String(anno))
    if (stato) sp.set('stato', stato)
    const res = await fetch(`/api/host/fatture?${sp}`)
    if (res.ok) {
      const data = await res.json()
      let lista: Fattura[] = data.fatture
      // Filtro client-side per search (numero/cliente)
      if (q.trim()) {
        const needle = q.trim().toLowerCase()
        lista = lista.filter((f) =>
          f.numero.toLowerCase().includes(needle)
          || f.clienteNome.toLowerCase().includes(needle),
        )
      }
      setFatture(lista)
      setTotale(data.total)
      setPagina(p)
    }
    setLoading(false)
  }, [anno, stato, q])

  useEffect(() => {
    cerca(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anno, stato])

  function onSearch(v: string) {
    setQ(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => cerca(1), 250)
  }

  function esportaCsv() {
    const sp = new URLSearchParams()
    if (anno) sp.set('anno', String(anno))
    if (stato) sp.set('stato', stato)
    window.location.href = `/api/host/fatture/export?${sp}`
  }

  async function invioSdi(id: string) {
    setAzione({ id, tipo: 'sdi' }); setErrore('')
    const res = await fetch(`/api/host/fatture/${id}/invia-sdi`, { method: 'POST' })
    setAzione(null)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      // Se provider = 'manuale' potrebbe richiedere download XML manuale
      setErrore(j.error || 'Errore invio SDI')
      return
    }
    await cerca(pagina)
  }

  function scaricaXml(id: string) {
    window.open(`/api/host/fatture/${id}/xml`, '_blank')
  }

  async function segnaPagata(id: string) {
    setAzione({ id, tipo: 'pagata' }); setErrore('')
    const res = await fetch(`/api/host/fatture/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'PAGATA' }),
    })
    setAzione(null)
    if (!res.ok) { setErrore('Errore aggiornamento stato'); return }
    await cerca(pagina)
  }

  async function notaCredito(id: string) {
    if (!window.confirm('Crea nota di credito completa (stornando tutte le righe)?')) return
    setAzione({ id, tipo: 'nc' }); setErrore('')
    const res = await fetch(`/api/host/fatture/${id}/nota-credito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setAzione(null)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore creazione nota di credito')
      return
    }
    await cerca(pagina)
  }

  const hasFilters = q || stato || (anno && anno !== annoDefault)

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title">Fatture</h1>
          <p className="text-sm text-gray-500">{totale} fatture totali · Fatturazione elettronica SDI</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={esportaCsv} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Esporta CSV
          </button>
          <Link href="/host/fatture/nuova" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuova fattura
          </Link>
        </div>
      </div>

      {/* Filtri */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cerca per numero o cliente…"
              className="input pl-9"
            />
            {q && (
              <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={anno}
            onChange={(e) => setAnno(e.target.value ? parseInt(e.target.value) : '')}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700"
          >
            <option value="">Tutti gli anni</option>
            {anniDisponibili.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['', 'BOZZA', 'INVIATA', 'PAGATA', 'SCADUTA', 'ANNULLATA', 'STORNATA'] as const).map((s) => (
            <button
              key={s || 'tutti'}
              onClick={() => setStato(s)}
              className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                stato === s
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s ? STATO_BADGE[s].label : 'Tutti'}
            </button>
          ))}

          {hasFilters && (
            <button
              onClick={() => { setQ(''); setStato(''); setAnno(annoDefault) }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Azzera filtri
            </button>
          )}
        </div>
      </div>

      {errore && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{errore}</div>
      )}

      {/* Tabella */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">Numero</th>
                <th className="table-th hidden md:table-cell">Data</th>
                <th className="table-th">Cliente</th>
                <th className="table-th hidden lg:table-cell">Imponibile</th>
                <th className="table-th hidden lg:table-cell">IVA</th>
                <th className="table-th">Totale</th>
                <th className="table-th">Stato</th>
                <th className="table-th hidden md:table-cell">SDI</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {fatture.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-gray-400 text-sm">
                    {hasFilters ? 'Nessuna fattura per i filtri selezionati' : 'Nessuna fattura ancora'}
                  </td>
                </tr>
              ) : (
                fatture.map((f) => {
                  const stato = STATO_BADGE[f.stato]
                  const sdiKey = !f.sdiStato ? 'da_inviare' : f.sdiStato
                  const sdi = SDI_BADGE[sdiKey] ?? { label: sdiKey, cls: 'bg-gray-100 text-gray-500' }
                  const isNotaCredito = f.tipoDocumento === 'TD04'
                  const busy = azione?.id === f.id

                  return (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50/60 group">
                      <td className="table-td">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-gray-900">{f.numero}</span>
                          {isNotaCredito && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-violet-50 text-violet-700 font-medium">NC</span>
                          )}
                        </div>
                      </td>
                      <td className="table-td hidden md:table-cell text-gray-500">
                        {format(new Date(f.dataEmissione), 'd MMM yyyy', { locale: it })}
                      </td>
                      <td className="table-td">
                        <p className="text-gray-900 font-medium truncate max-w-[180px]">{f.clienteNome}</p>
                        {f.clientePIva && <p className="text-xs text-gray-400 font-mono">{f.clientePIva}</p>}
                      </td>
                      <td className="table-td hidden lg:table-cell text-gray-600">€{f.imponibile.toFixed(2)}</td>
                      <td className="table-td hidden lg:table-cell text-gray-600">€{f.iva.toFixed(2)}</td>
                      <td className="table-td font-bold">€{f.totale.toFixed(2)}</td>
                      <td className="table-td">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stato.cls}`}>{stato.label}</span>
                      </td>
                      <td className="table-td hidden md:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sdi.cls}`}>{sdi.label}</span>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <ActionButton
                            icon={<FileDown className="w-3.5 h-3.5" />}
                            label="Scarica PDF"
                            onClick={() => window.open(`/api/host/fatture/${f.id}/pdf`, '_blank')}
                          />
                          {!f.sdiInviatoAt && f.stato !== 'BOZZA' && !isNotaCredito && (
                            <ActionButton
                              icon={busy && azione?.tipo === 'sdi' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              label="Invia SDI"
                              onClick={() => invioSdi(f.id)}
                              color="brand"
                            />
                          )}
                          <ActionButton
                            icon={<FileCode className="w-3.5 h-3.5" />}
                            label="XML SDI"
                            onClick={() => scaricaXml(f.id)}
                          />
                          {f.stato === 'INVIATA' && (
                            <ActionButton
                              icon={busy && azione?.tipo === 'pagata' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              label="Segna pagata"
                              onClick={() => segnaPagata(f.id)}
                              color="green"
                            />
                          )}
                          {!isNotaCredito && ['INVIATA', 'PAGATA', 'SCADUTA'].includes(f.stato) && (
                            <ActionButton
                              icon={busy && azione?.tipo === 'nc' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                              label="Nota credito"
                              onClick={() => notaCredito(f.id)}
                              color="violet"
                            />
                          )}
                          <Link
                            href={`/host/fatture/${f.id}`}
                            className="p-1.5 rounded text-gray-400 hover:text-brand-500 hover:bg-brand-50"
                            title="Apri"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  icon, label, onClick, color = 'gray',
}: {
  icon: React.ReactNode; label: string; onClick: () => void; color?: 'gray' | 'brand' | 'green' | 'violet'
}) {
  const colorMap = {
    gray: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
    brand: 'text-brand-500 hover:text-brand-700 hover:bg-brand-50',
    green: 'text-green-600 hover:text-green-700 hover:bg-green-50',
    violet: 'text-violet-600 hover:text-violet-700 hover:bg-violet-50',
  }
  return (
    <button onClick={onClick} className={`p-1.5 rounded transition-colors ${colorMap[color]}`} title={label}>
      {icon}
    </button>
  )
}
