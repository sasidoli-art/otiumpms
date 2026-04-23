'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Euro, FileText, CreditCard, Building2, Percent,
  Download, FileDown, Loader2, ArrowUpDown, ArrowUp, ArrowDown,
  TrendingUp, TrendingDown, Check, AlertTriangle,
} from 'lucide-react'
import {
  startOfMonth, format, subMonths, startOfYear,
} from 'date-fns'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type Tab = 'periodo' | 'camera' | 'incassi' | 'tassa' | 'iva'

type RigaRevenue = {
  periodo: string
  prenotazioni: number; notti: number
  revenueCamere: number; revenueSpa: number; revenuePOS: number; revenueFB: number
  tassaSoggiorno: number; totale: number
}

type RevenueData = {
  periodo: { da: string; a: string; granularita: 'giorno' | 'mese'; vista: string }
  righe: RigaRevenue[]
  totali: Omit<RigaRevenue, 'periodo'>
  camere: Array<{
    unitaNome: string; notti: number; occupazione: number
    revenue: number; adr: number; revpar: number
  }>
}

type IncassiData = {
  periodo: { da: string; a: string }
  righe: Array<{
    id: string; data: string; descrizione: string; cameraOspite: string | null
    metodo: string; importo: number; operatore: string | null; origine: string
  }>
  perMetodo: Array<{ metodo: string; count: number; totale: number }>
  riconciliazione: { totaleIncassato: number; totaleFatturato: number; discrepanza: number; quadrato: boolean }
}

type TassaData = {
  anno: number; mese: number
  dettaglio: Array<{
    ospite: string; struttura: string; unita: string
    arrivo: string; partenza: string | null
    nottiNelMese: number; numOspiti: number
    tassaPerNotte: number; totaleTassa: number
  }>
  perStruttura: Array<{ nome: string; citta: string; ospiti: number; notti: number; totale: number }>
  riepilogo: { prenotazioni: number; totaleOspiti: number; totaleNotti: number; totaleTassa: number }
}

type IvaData = {
  periodo: { tipo: string; anno: number; mese: number | null; trimestre: number | null; da: string; a: string }
  fattureEsaminate: number
  righe: Array<{ aliquota: number; natura: string | null; imponibile: number; iva: number; totale: number }>
  totali: { imponibile: number; iva: number; totale: number }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n ?? 0)
const fmtNum = (n: number) => new Intl.NumberFormat('it-IT').format(n ?? 0)
const fmtPct = (n: number) => `${(n ?? 0).toFixed(1)}%`

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

const METODI_COLORS: Record<string, string> = {
  CONTANTI: 'bg-emerald-100 text-emerald-800',
  CARTA: 'bg-blue-100 text-blue-800',
  CAMERA_CREDIT: 'bg-amber-100 text-amber-800',
  BONIFICO: 'bg-violet-100 text-violet-800',
  GIFT_CARD: 'bg-pink-100 text-pink-800',
  TRANSFERWISE: 'bg-sky-100 text-sky-800',
  MISTO: 'bg-gray-100 text-gray-800',
}

function periodoLabel(periodoKey: string, granularita: 'giorno' | 'mese'): string {
  if (granularita === 'mese') {
    const [anno, mese] = periodoKey.split('-')
    return `${MESI[Number(mese) - 1]} ${anno}`
  }
  return format(new Date(periodoKey), 'dd/MM/yyyy')
}

// ────────────────────────────────────────────────────────────────────────────
// Sotto-componenti
// ────────────────────────────────────────────────────────────────────────────

function TabButton({ active, icon: Icon, label, onClick }: {
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-indigo-600 text-indigo-700'
          : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function PeriodoFilter({
  da, a, granularita,
  onChangeDa, onChangeA, onChangeGran,
}: {
  da: string; a: string; granularita: 'giorno' | 'mese'
  onChangeDa: (v: string) => void
  onChangeA: (v: string) => void
  onChangeGran: (g: 'giorno' | 'mese') => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={da}
        onChange={(e) => onChangeDa(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      />
      <span className="text-gray-400 text-sm">→</span>
      <input
        type="date"
        value={a}
        onChange={(e) => onChangeA(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      />
      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        <button
          onClick={() => onChangeGran('giorno')}
          className={`px-3 py-2 text-sm font-medium ${granularita === 'giorno' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Giorno
        </button>
        <button
          onClick={() => onChangeGran('mese')}
          className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${granularita === 'mese' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Mese
        </button>
      </div>
    </div>
  )
}

function ExportButtons({ tipo, params }: {
  tipo: 'revenue' | 'incassi' | 'tassa' | 'iva'
  params: Record<string, string>
}) {
  const buildUrl = (formato: 'csv' | 'pdf') => {
    const sp = new URLSearchParams({ tipo, formato, ...params })
    return `/api/host/report/export?${sp}`
  }
  return (
    <div className="flex items-center gap-1.5">
      <a
        href={buildUrl('csv')}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
      >
        <Download className="w-4 h-4" /> CSV
      </a>
      {tipo !== 'iva' || true ? (
        <a
          href={buildUrl('pdf')}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
        >
          <FileDown className="w-4 h-4" /> PDF
        </a>
      ) : null}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

export default function ReportRevenue() {
  const [tab, setTab] = useState<Tab>('periodo')

  // Filtri periodo per tab 1/2/3
  const oggi = new Date()
  const [da, setDa] = useState(format(startOfMonth(oggi), 'yyyy-MM-dd'))
  const [a, setA] = useState(format(oggi, 'yyyy-MM-dd'))
  const [granularita, setGranularita] = useState<'giorno' | 'mese'>('giorno')

  // Filtri Tassa
  const [tassaAnno, setTassaAnno] = useState(oggi.getFullYear())
  const [tassaMese, setTassaMese] = useState(oggi.getMonth() + 1)

  // Filtri IVA
  const [ivaPeriodo, setIvaPeriodo] = useState<'mese' | 'trimestre' | 'anno'>('mese')
  const [ivaAnno, setIvaAnno] = useState(oggi.getFullYear())
  const [ivaMese, setIvaMese] = useState(oggi.getMonth() + 1)
  const [ivaTrimestre, setIvaTrimestre] = useState(Math.floor(oggi.getMonth() / 3) + 1)

  // Filtri Incassi
  const [metodoFiltro, setMetodoFiltro] = useState<string>('')

  return (
    <div className="space-y-5">
      {/* Header tabs */}
      <div className="border-b border-gray-200 flex items-center gap-1 overflow-x-auto">
        <TabButton active={tab === 'periodo'} icon={Euro} label="Revenue per periodo" onClick={() => setTab('periodo')} />
        <TabButton active={tab === 'camera'} icon={Building2} label="Revenue per camera" onClick={() => setTab('camera')} />
        <TabButton active={tab === 'incassi'} icon={CreditCard} label="Incassi" onClick={() => setTab('incassi')} />
        <TabButton active={tab === 'tassa'} icon={FileText} label="Tassa di soggiorno" onClick={() => setTab('tassa')} />
        <TabButton active={tab === 'iva'} icon={Percent} label="IVA" onClick={() => setTab('iva')} />
      </div>

      {/* ─── Tab 1: Revenue per periodo ─────────────────────────────────── */}
      {tab === 'periodo' && (
        <TabRevenuePeriodo
          da={da} a={a} granularita={granularita}
          onChangeDa={setDa} onChangeA={setA} onChangeGran={setGranularita}
        />
      )}

      {/* ─── Tab 2: Revenue per camera ──────────────────────────────────── */}
      {tab === 'camera' && (
        <TabRevenueCamera
          da={da} a={a}
          onChangeDa={setDa} onChangeA={setA}
        />
      )}

      {/* ─── Tab 3: Incassi ─────────────────────────────────────────────── */}
      {tab === 'incassi' && (
        <TabIncassi
          da={da} a={a} metodo={metodoFiltro}
          onChangeDa={setDa} onChangeA={setA} onChangeMetodo={setMetodoFiltro}
        />
      )}

      {/* ─── Tab 4: Tassa di soggiorno ──────────────────────────────────── */}
      {tab === 'tassa' && (
        <TabTassaSoggiorno
          anno={tassaAnno} mese={tassaMese}
          onChangeAnno={setTassaAnno} onChangeMese={setTassaMese}
        />
      )}

      {/* ─── Tab 5: IVA ─────────────────────────────────────────────────── */}
      {tab === 'iva' && (
        <TabIva
          periodo={ivaPeriodo} anno={ivaAnno} mese={ivaMese} trimestre={ivaTrimestre}
          onChangePeriodo={setIvaPeriodo} onChangeAnno={setIvaAnno}
          onChangeMese={setIvaMese} onChangeTrimestre={setIvaTrimestre}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 1: Revenue per periodo
// ────────────────────────────────────────────────────────────────────────────

function TabRevenuePeriodo({
  da, a, granularita, onChangeDa, onChangeA, onChangeGran,
}: {
  da: string; a: string; granularita: 'giorno' | 'mese'
  onChangeDa: (v: string) => void; onChangeA: (v: string) => void
  onChangeGran: (g: 'giorno' | 'mese') => void
}) {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setLoading(true); setErrore(null)
    try {
      const sp = new URLSearchParams({ da, a, granularita, view: 'periodo' })
      const res = await fetch(`/api/host/report/revenue?${sp}`)
      if (!res.ok) throw new Error('Errore nel caricamento')
      setData(await res.json())
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [da, a, granularita])

  useEffect(() => { carica() }, [carica])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <PeriodoFilter
          da={da} a={a} granularita={granularita}
          onChangeDa={onChangeDa} onChangeA={onChangeA} onChangeGran={onChangeGran}
        />
        <ExportButtons tipo="revenue" params={{ da, a, granularita, view: 'periodo' }} />
      </div>

      {loading && !data && <LoadingBox />}
      {errore && <ErrorBox msg={errore} />}

      {data && (
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">{granularita === 'giorno' ? 'Data' : 'Mese'}</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Pren.</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Notti</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Camere</th>
                  <th className="text-right px-4 py-2.5 font-semibold">SPA</th>
                  <th className="text-right px-4 py-2.5 font-semibold">POS</th>
                  <th className="text-right px-4 py-2.5 font-semibold">F&B</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Tassa</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Totale</th>
                </tr>
              </thead>
              <tbody>
                {data.righe.map((r) => (
                  <tr key={r.periodo} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{periodoLabel(r.periodo, granularita)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtNum(r.prenotazioni)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtNum(r.notti)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(r.revenueCamere)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(r.revenueSpa)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(r.revenuePOS)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(r.revenueFB)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(r.tassaSoggiorno)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-semibold text-gray-900">{fmtEuro(r.totale)}</td>
                  </tr>
                ))}
                {data.righe.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nessun dato nel periodo</td></tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold text-gray-900">
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-2.5">Totale</td>
                  <td className="text-right px-4 py-2.5 tabular-nums">{fmtNum(data.totali.prenotazioni)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums">{fmtNum(data.totali.notti)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums">{fmtEuro(data.totali.revenueCamere)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums">{fmtEuro(data.totali.revenueSpa)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums">{fmtEuro(data.totali.revenuePOS)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums">{fmtEuro(data.totali.revenueFB)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums">{fmtEuro(data.totali.tassaSoggiorno)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums text-indigo-700">{fmtEuro(data.totali.totale)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 2: Revenue per camera
// ────────────────────────────────────────────────────────────────────────────

type CameraSortKey = 'unitaNome' | 'notti' | 'occupazione' | 'revenue' | 'adr' | 'revpar'

function TabRevenueCamera({
  da, a, onChangeDa, onChangeA,
}: {
  da: string; a: string
  onChangeDa: (v: string) => void; onChangeA: (v: string) => void
}) {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: CameraSortKey; dir: 'asc' | 'desc' }>({ key: 'revenue', dir: 'desc' })

  const carica = useCallback(async () => {
    setLoading(true); setErrore(null)
    try {
      const sp = new URLSearchParams({ da, a, view: 'camera' })
      const res = await fetch(`/api/host/report/revenue?${sp}`)
      if (!res.ok) throw new Error('Errore nel caricamento')
      setData(await res.json())
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [da, a])

  useEffect(() => { carica() }, [carica])

  const camereOrdinate = useMemo(() => {
    if (!data) return []
    const copy = [...data.camere]
    copy.sort((a, b) => {
      const v1 = a[sort.key]
      const v2 = b[sort.key]
      if (typeof v1 === 'number' && typeof v2 === 'number') {
        return sort.dir === 'asc' ? v1 - v2 : v2 - v1
      }
      return sort.dir === 'asc'
        ? String(v1).localeCompare(String(v2))
        : String(v2).localeCompare(String(v1))
    })
    return copy
  }, [data, sort])

  const top = camereOrdinate[0]
  const bottom = camereOrdinate[camereOrdinate.length - 1]

  const toggleSort = (key: CameraSortKey) => {
    setSort((s) => s.key === key
      ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' }
    )
  }

  const SortIcon = ({ k }: { k: CameraSortKey }) => {
    if (sort.key !== k) return <ArrowUpDown className="w-3 h-3 inline opacity-40" />
    return sort.dir === 'asc'
      ? <ArrowUp className="w-3 h-3 inline text-indigo-600" />
      : <ArrowDown className="w-3 h-3 inline text-indigo-600" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <input
            type="date" value={da}
            onChange={(e) => onChangeDa(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <span className="text-gray-400 text-sm">→</span>
          <input
            type="date" value={a}
            onChange={(e) => onChangeA(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <ExportButtons tipo="revenue" params={{ da, a, view: 'camera' }} />
      </div>

      {loading && !data && <LoadingBox />}
      {errore && <ErrorBox msg={errore} />}

      {data && (
        <>
          {camereOrdinate.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Top performance
                </div>
                <div className="text-lg font-bold text-gray-900">{top?.unitaNome}</div>
                <div className="text-sm text-emerald-700">
                  {fmtEuro(top?.revenue ?? 0)} · {fmtNum(top?.notti ?? 0)} notti · ADR {fmtEuro(top?.adr ?? 0)}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 uppercase tracking-wide mb-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Da migliorare
                </div>
                <div className="text-lg font-bold text-gray-900">{bottom?.unitaNome}</div>
                <div className="text-sm text-rose-700">
                  {fmtEuro(bottom?.revenue ?? 0)} · {fmtNum(bottom?.notti ?? 0)} notti · ADR {fmtEuro(bottom?.adr ?? 0)}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    {[
                      { key: 'unitaNome' as const, label: 'Camera', align: 'left' as const },
                      { key: 'notti' as const, label: 'Notti', align: 'right' as const },
                      { key: 'occupazione' as const, label: '% occup.', align: 'right' as const },
                      { key: 'revenue' as const, label: 'Revenue', align: 'right' as const },
                      { key: 'adr' as const, label: 'ADR', align: 'right' as const },
                      { key: 'revpar' as const, label: 'RevPAR', align: 'right' as const },
                    ].map((c) => (
                      <th
                        key={c.key}
                        onClick={() => toggleSort(c.key)}
                        className={`px-4 py-2.5 font-semibold cursor-pointer select-none hover:bg-gray-100 text-${c.align}`}
                      >
                        {c.label} <SortIcon k={c.key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {camereOrdinate.map((c, i) => {
                    const isTop = i === 0 && camereOrdinate.length > 1
                    const isBottom = i === camereOrdinate.length - 1 && camereOrdinate.length > 1
                    return (
                      <tr
                        key={c.unitaNome}
                        className={`border-t border-gray-100 hover:bg-gray-50/50 ${
                          isTop ? 'bg-emerald-50/40' : isBottom ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 font-medium text-gray-900">{c.unitaNome}</td>
                        <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtNum(c.notti)}</td>
                        <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtPct(c.occupazione)}</td>
                        <td className="text-right px-4 py-2.5 tabular-nums font-semibold text-gray-900">{fmtEuro(c.revenue)}</td>
                        <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(c.adr)}</td>
                        <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(c.revpar)}</td>
                      </tr>
                    )
                  })}
                  {camereOrdinate.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nessuna camera nel periodo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 3: Incassi
// ────────────────────────────────────────────────────────────────────────────

function TabIncassi({
  da, a, metodo, onChangeDa, onChangeA, onChangeMetodo,
}: {
  da: string; a: string; metodo: string
  onChangeDa: (v: string) => void; onChangeA: (v: string) => void; onChangeMetodo: (v: string) => void
}) {
  const [data, setData] = useState<IncassiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setLoading(true); setErrore(null)
    try {
      const sp = new URLSearchParams({ da, a })
      if (metodo) sp.set('metodo', metodo)
      const res = await fetch(`/api/host/report/incassi?${sp}`)
      if (!res.ok) throw new Error('Errore nel caricamento')
      setData(await res.json())
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [da, a, metodo])

  useEffect(() => { carica() }, [carica])

  const exportParams: Record<string, string> = { da, a }
  if (metodo) exportParams.metodo = metodo

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date" value={da}
            onChange={(e) => onChangeDa(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <span className="text-gray-400 text-sm">→</span>
          <input
            type="date" value={a}
            onChange={(e) => onChangeA(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <select
            value={metodo}
            onChange={(e) => onChangeMetodo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="">Tutti i metodi</option>
            <option value="CONTANTI">Contanti</option>
            <option value="CARTA">Carta</option>
            <option value="CAMERA_CREDIT">Camera credit</option>
            <option value="BONIFICO">Bonifico</option>
            <option value="GIFT_CARD">Gift card</option>
          </select>
        </div>
        <ExportButtons tipo="incassi" params={exportParams} />
      </div>

      {loading && !data && <LoadingBox />}
      {errore && <ErrorBox msg={errore} />}

      {data && (
        <>
          {/* Riconciliazione */}
          <div className={`p-4 rounded-xl border ${
            data.riconciliazione.quadrato
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              {data.riconciliazione.quadrato ? (
                <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={`text-sm font-semibold ${data.riconciliazione.quadrato ? 'text-emerald-900' : 'text-amber-900'}`}>
                    {data.riconciliazione.quadrato ? 'Cassa quadrata' : 'Discrepanza rilevata'}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Incassato: <strong>{fmtEuro(data.riconciliazione.totaleIncassato)}</strong>
                    <span className="mx-2">·</span>
                    Fatturato: <strong>{fmtEuro(data.riconciliazione.totaleFatturato)}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Differenza</div>
                  <div className={`text-lg font-bold ${
                    data.riconciliazione.quadrato ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {data.riconciliazione.discrepanza >= 0 ? '+' : ''}{fmtEuro(data.riconciliazione.discrepanza)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Totali per metodo */}
          {data.perMetodo.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {data.perMetodo.map((m) => (
                <div key={m.metodo} className="p-3 rounded-lg border border-gray-200 bg-white">
                  <div className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${METODI_COLORS[m.metodo] ?? 'bg-gray-100 text-gray-800'}`}>
                    {m.metodo.replace('_', ' ')}
                  </div>
                  <div className="text-lg font-bold text-gray-900 mt-1 tabular-nums">{fmtEuro(m.totale)}</div>
                  <div className="text-xs text-gray-500">{m.count} mov.</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabella */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Data</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Descrizione</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Camera / Ospite</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Metodo</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Importo</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Operatore</th>
                  </tr>
                </thead>
                <tbody>
                  {data.righe.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{new Date(r.data).toLocaleDateString('it-IT')}</td>
                      <td className="px-4 py-2.5 text-gray-900">{r.descrizione}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.cameraOspite ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${METODI_COLORS[r.metodo] ?? 'bg-gray-100 text-gray-800'}`}>
                          {r.metodo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-semibold text-gray-900">{fmtEuro(r.importo)}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{r.operatore ?? '—'}</td>
                    </tr>
                  ))}
                  {data.righe.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nessun incasso nel periodo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 4: Tassa di soggiorno
// ────────────────────────────────────────────────────────────────────────────

function TabTassaSoggiorno({
  anno, mese, onChangeAnno, onChangeMese,
}: {
  anno: number; mese: number
  onChangeAnno: (v: number) => void; onChangeMese: (v: number) => void
}) {
  const [data, setData] = useState<TassaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setLoading(true); setErrore(null)
    try {
      const res = await fetch(`/api/host/report/tassa-soggiorno?anno=${anno}&mese=${mese}`)
      if (!res.ok) throw new Error('Errore nel caricamento')
      setData(await res.json())
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [anno, mese])

  useEffect(() => { carica() }, [carica])

  const anni = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 2, y - 1, y, y + 1]
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <select
            value={mese}
            onChange={(e) => onChangeMese(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            {MESI.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={anno}
            onChange={(e) => onChangeAnno(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            {anni.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <ExportButtons tipo="tassa" params={{ anno: String(anno), mese: String(mese) }} />
      </div>

      {loading && !data && <LoadingBox />}
      {errore && <ErrorBox msg={errore} />}

      {data && (
        <>
          {/* Riepilogo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Prenotazioni" value={fmtNum(data.riepilogo.prenotazioni)} />
            <Kpi label="Ospiti totali" value={fmtNum(data.riepilogo.totaleOspiti)} />
            <Kpi label="Notti tassabili" value={fmtNum(data.riepilogo.totaleNotti)} />
            <Kpi label="Totale tassa" value={fmtEuro(data.riepilogo.totaleTassa)} highlight />
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>Nota:</strong> la determinazione degli ospiti esenti (minori di 14 anni, residenti, ecc.)
            dipende dal regolamento comunale. Per ora l&apos;export è in formato CSV generico —
            specifici formati per Comune verranno aggiunti su richiesta.
          </div>

          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Ospite</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Struttura</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Unità</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Arrivo</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Partenza</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Notti</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Osp.</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Tassa/notte</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dettaglio.map((d, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{d.ospite}</td>
                      <td className="px-4 py-2.5 text-gray-600">{d.struttura}</td>
                      <td className="px-4 py-2.5 text-gray-600">{d.unita}</td>
                      <td className="px-4 py-2.5 text-gray-600">{d.arrivo ? new Date(d.arrivo).toLocaleDateString('it-IT') : '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{d.partenza ? new Date(d.partenza).toLocaleDateString('it-IT') : '—'}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{d.nottiNelMese}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{d.numOspiti}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(d.tassaPerNotte)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-semibold text-gray-900">{fmtEuro(d.totaleTassa)}</td>
                    </tr>
                  ))}
                  {data.dettaglio.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nessun ospite tassabile nel mese</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 5: IVA
// ────────────────────────────────────────────────────────────────────────────

function TabIva({
  periodo, anno, mese, trimestre,
  onChangePeriodo, onChangeAnno, onChangeMese, onChangeTrimestre,
}: {
  periodo: 'mese' | 'trimestre' | 'anno'
  anno: number; mese: number; trimestre: number
  onChangePeriodo: (v: 'mese' | 'trimestre' | 'anno') => void
  onChangeAnno: (v: number) => void
  onChangeMese: (v: number) => void
  onChangeTrimestre: (v: number) => void
}) {
  const [data, setData] = useState<IvaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setLoading(true); setErrore(null)
    try {
      const sp = new URLSearchParams({ periodo, anno: String(anno) })
      if (periodo === 'mese') sp.set('mese', String(mese))
      if (periodo === 'trimestre') sp.set('trimestre', String(trimestre))
      const res = await fetch(`/api/host/report/iva?${sp}`)
      if (!res.ok) throw new Error('Errore nel caricamento')
      setData(await res.json())
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [periodo, anno, mese, trimestre])

  useEffect(() => { carica() }, [carica])

  const anni = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 2, y - 1, y, y + 1]
  }, [])

  const exportParams: Record<string, string> = { periodo, anno: String(anno) }
  if (periodo === 'mese') exportParams.mese = String(mese)
  if (periodo === 'trimestre') exportParams.trimestre = String(trimestre)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            {(['mese', 'trimestre', 'anno'] as const).map((p) => (
              <button
                key={p}
                onClick={() => onChangePeriodo(p)}
                className={`px-3 py-2 text-sm font-medium capitalize border-l border-gray-300 first:border-l-0 ${
                  periodo === p ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <select
            value={anno}
            onChange={(e) => onChangeAnno(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            {anni.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {periodo === 'mese' && (
            <select
              value={mese}
              onChange={(e) => onChangeMese(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {MESI.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          )}
          {periodo === 'trimestre' && (
            <select
              value={trimestre}
              onChange={(e) => onChangeTrimestre(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{t}° trimestre</option>)}
            </select>
          )}
        </div>
        <ExportButtons tipo="iva" params={exportParams} />
      </div>

      {loading && !data && <LoadingBox />}
      {errore && <ErrorBox msg={errore} />}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Kpi label="Fatture esaminate" value={fmtNum(data.fattureEsaminate)} />
            <Kpi label="Imponibile" value={fmtEuro(data.totali.imponibile)} />
            <Kpi label="IVA a debito" value={fmtEuro(data.totali.iva)} highlight />
          </div>

          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Aliquota</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Natura esenzione</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Imponibile</th>
                    <th className="text-right px-4 py-2.5 font-semibold">IVA</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {data.righe.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{r.aliquota}%</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.natura ?? '—'}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(r.imponibile)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{fmtEuro(r.iva)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-semibold text-gray-900">{fmtEuro(r.totale)}</td>
                    </tr>
                  ))}
                  {data.righe.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessuna fattura nel periodo</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold text-gray-900">
                  <tr className="border-t border-gray-200">
                    <td className="px-4 py-2.5" colSpan={2}>Totale</td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{fmtEuro(data.totali.imponibile)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{fmtEuro(data.totali.iva)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-indigo-700">{fmtEuro(data.totali.totale)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Shared UI
// ────────────────────────────────────────────────────────────────────────────

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold mt-0.5 tabular-nums ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  )
}

function LoadingBox() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento...
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{msg}</div>
  )
}

// imports kept for future use — prevent tree-shake warnings
void startOfYear
void subMonths
