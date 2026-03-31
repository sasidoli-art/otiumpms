'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  TrendingUp, TrendingDown, Euro, BedDouble, CalendarCheck, Building2,
  ChevronLeft, ChevronRight, Loader2, Download, FileText, Minus,
  Clock, XCircle, Globe, BarChart3,
} from 'lucide-react'

type RevenueGiorno = { data: string; revenue: number }
type PerStruttura = { nome: string; prenotazioni: number; nottiOccupate: number; revenue: number }
type ForecastGiorno = { data: string; occupate: number; totale: number }
type PerFonte = { fonte: string; prenotazioni: number; revenue: number }
type Confronto = {
  revenue: number; occupazione: number; prenotazioni: number; revpar: number; adr: number
  prevRevenue: number; prevOccupazione: number; prevPrenotazioni: number; prevRevpar: number; prevAdr: number
}
type ConfrontoYoY = {
  revenue: number; occupazione: number; prenotazioni: number; revpar: number; adr: number
  prevRevenue: number; prevOccupazione: number; prevPrenotazioni: number
}
type Forecast = {
  giorni: ForecastGiorno[]; mediaOccupazione: number; nottiPrenotate: number; capacitaTotale: number
}
type DatiReport = {
  anno: number; mese: number; numGiorni: number; unitaTotali: number
  numPrenotazioni: number; nottiOccupate: number; capacitaTotale: number
  occupazionePercent: number; revenueTotale: number; revpar: number
  adr: number; durataMediaSoggiorno: number
  cancellazionePct: number; cancellazioni: number
  perStruttura: PerStruttura[]
  perFonte: PerFonte[]
  revenuePerGiorno: RevenueGiorno[]
  confronto: Confronto
  confrontoYoY: ConfrontoYoY
  forecast: Forecast
}

const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

function DeltaBadge({ value, suffix = '%', invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0
  const negative = invert ? value > 0 : value < 0
  if (value === 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
      <Minus className="w-3 h-3" /> 0{suffix}
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
      positive ? 'text-green-600' : negative ? 'text-red-500' : 'text-gray-400'
    }`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  )
}

export default function ReportClient({
  annoIniziale, meseIniziale,
}: {
  annoIniziale: number; meseIniziale: number
}) {
  const [anno, setAnno] = useState(annoIniziale)
  const [mese, setMese] = useState(meseIniziale)
  const [dati, setDati] = useState<DatiReport | null>(null)
  const [caricamento, setCaricamento] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const caricaDati = useCallback(async (a: number, m: number) => {
    setCaricamento(true); setErrore(null)
    try {
      const res = await fetch(`/api/host/report?anno=${a}&mese=${m}`)
      if (!res.ok) throw new Error('Errore nel caricamento del report')
      setDati(await res.json())
    } catch (e: unknown) {
      setErrore(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally { setCaricamento(false) }
  }, [])

  useEffect(() => { caricaDati(anno, mese) }, [anno, mese, caricaDati])

  function mesePrec() {
    if (mese === 1) { setAnno(a => a - 1); setMese(12) } else setMese(m => m - 1)
  }
  function meseSucc() {
    if (mese === 12) { setAnno(a => a + 1); setMese(1) } else setMese(m => m + 1)
  }

  function exportCsv() {
    if (!dati) return
    const header = 'Data,Revenue'
    const rows = dati.revenuePerGiorno.map(g => `${g.data},${g.revenue.toFixed(2)}`)
    const strutHeader = '\n\nStruttura,Prenotazioni,Notti Occupate,Revenue'
    const strutRows = dati.perStruttura.map(s => `${s.nome},${s.prenotazioni},${s.nottiOccupate},${s.revenue.toFixed(2)}`)
    const fonteHeader = '\n\nFonte,Prenotazioni,Revenue'
    const fonteRows = dati.perFonte.map(f => `${f.fonte},${f.prenotazioni},${f.revenue.toFixed(2)}`)
    const summary = `\n\nRiepilogo ${MESI[mese - 1]} ${anno}\nPrenotazioni,${dati.numPrenotazioni}\nOccupazione,${dati.occupazionePercent}%\nRevenue Totale,${dati.revenueTotale.toFixed(2)}\nRevPAR,${dati.revpar.toFixed(2)}\nADR,${dati.adr.toFixed(2)}\nDurata media soggiorno,${dati.durataMediaSoggiorno}\nTasso cancellazione,${dati.cancellazionePct}%`
    const csv = [header, ...rows, strutHeader, ...strutRows, fonteHeader, ...fonteRows, summary].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `report_${anno}_${String(mese).padStart(2, '0')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function downloadPdf() {
    window.open(`/api/host/report/pdf?anno=${anno}&mese=${mese}`, '_blank')
  }

  const maxRevenue = dati ? Math.max(...dati.revenuePerGiorno.map(g => g.revenue), 1) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report PMS</h1>
          <p className="text-sm text-gray-500">Statistiche mensili con confronto e forecast</p>
        </div>
        {dati && !caricamento && (
          <div className="flex items-center gap-2">
            <button onClick={downloadPdf} className="btn-secondary flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button onClick={exportCsv} className="btn-primary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        )}
      </div>

      {/* Selezione mese */}
      <div className="card flex items-center justify-between">
        <button onClick={mesePrec} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{MESI[mese - 1]} {anno}</p>
        </div>
        <button onClick={meseSucc} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {caricamento && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mr-2" /> Caricamento dati...
        </div>
      )}
      {errore && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{errore}</div>}

      {dati && !caricamento && (
        <>
          {/* KPI cards con confronto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<Euro className="w-5 h-5 text-brand-500" />}
              titolo="Revenue"
              valore={`€${dati.revenueTotale.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`}
              bg="bg-brand-500/10"
              delta={<DeltaBadge value={dati.confronto.revenue} />}
              sub={`vs €${Math.round(dati.confronto.prevRevenue).toLocaleString('it-IT')}`}
            />
            <KpiCard
              icon={<TrendingUp className="w-5 h-5 text-green-600" />}
              titolo="Occupazione"
              valore={`${dati.occupazionePercent}%`}
              bg="bg-green-50"
              delta={<DeltaBadge value={dati.confronto.occupazione} suffix=" pp" />}
              sub={`${dati.nottiOccupate} / ${dati.capacitaTotale} notti`}
            />
            <KpiCard
              icon={<BedDouble className="w-5 h-5 text-blue-600" />}
              titolo="RevPAR"
              valore={`€${dati.revpar.toFixed(2)}`}
              bg="bg-blue-50"
              delta={<DeltaBadge value={dati.confronto.revpar} />}
              sub={`vs €${dati.confronto.prevRevpar.toFixed(2)}`}
            />
            <KpiCard
              icon={<CalendarCheck className="w-5 h-5 text-amber-500" />}
              titolo="Prenotazioni"
              valore={String(dati.numPrenotazioni)}
              bg="bg-amber-50"
              delta={<DeltaBadge value={dati.confronto.prenotazioni} />}
              sub={`vs ${dati.confronto.prevPrenotazioni} mese prec.`}
            />
          </div>

          {/* KPI secondari */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
              titolo="ADR"
              valore={`€${dati.adr.toFixed(2)}`}
              bg="bg-purple-50"
              delta={<DeltaBadge value={dati.confronto.adr} />}
              sub={`vs €${dati.confronto.prevAdr.toFixed(2)}`}
            />
            <KpiCard
              icon={<Clock className="w-5 h-5 text-teal-600" />}
              titolo="Durata media"
              valore={`${dati.durataMediaSoggiorno} notti`}
              bg="bg-teal-50"
            />
            <KpiCard
              icon={<XCircle className="w-5 h-5 text-red-500" />}
              titolo="Cancellazioni"
              valore={`${dati.cancellazionePct}%`}
              bg="bg-red-50"
              sub={`${dati.cancellazioni} su ${dati.numPrenotazioni + dati.cancellazioni} totali`}
            />
            <KpiCard
              icon={<Globe className="w-5 h-5 text-indigo-500" />}
              titolo="YoY Revenue"
              valore={`${dati.confrontoYoY.revenue > 0 ? '+' : ''}${dati.confrontoYoY.revenue}%`}
              bg="bg-indigo-50"
              sub={`vs €${Math.round(dati.confrontoYoY.prevRevenue).toLocaleString('it-IT')} (${dati.anno - 1})`}
            />
          </div>

          {/* Grafico revenue giornaliero */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue giornaliero</h2>
            <div className="flex items-end gap-0.5 h-32">
              {dati.revenuePerGiorno.map(g => {
                const perc = (g.revenue / maxRevenue) * 100
                const data = new Date(g.data + 'T12:00:00')
                return (
                  <div key={g.data} className="flex-1 flex flex-col items-center justify-end group relative" style={{ minWidth: 0 }}>
                    <div
                      className="w-full rounded-t bg-brand-500/70 hover:bg-brand-500 transition-colors cursor-default"
                      style={{ height: `${Math.max(perc, 2)}%` }}
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow">
                      {format(data, 'd MMM', { locale: it })}: €{g.revenue.toFixed(0)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex mt-1 text-xs text-gray-400">
              {dati.revenuePerGiorno
                .filter((_, i) => i % 7 === 0 || i === 0)
                .map(g => <div key={g.data} className="flex-1">{format(new Date(g.data + 'T12:00:00'), 'd/M')}</div>)}
            </div>
          </div>

          {/* Forecast prossimi 30 giorni */}
          <div className="card border-l-4 border-l-indigo-400">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-semibold text-gray-900">Forecast prossimi 30 giorni</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xs text-indigo-600 font-medium">Occupazione prevista</p>
                <p className="text-2xl font-bold text-indigo-700">{dati.forecast.mediaOccupazione}%</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xs text-indigo-600 font-medium">Notti prenotate</p>
                <p className="text-2xl font-bold text-indigo-700">{dati.forecast.nottiPrenotate}</p>
                <p className="text-xs text-indigo-400">su {dati.forecast.capacitaTotale} disponibili</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xs text-indigo-600 font-medium">Notti libere</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {dati.forecast.capacitaTotale - dati.forecast.nottiPrenotate}
                </p>
                <p className="text-xs text-indigo-400">ancora vendibili</p>
              </div>
            </div>
            {/* Mini forecast chart */}
            <div className="flex items-end gap-px h-16">
              {dati.forecast.giorni.map(g => {
                const perc = g.totale > 0 ? (g.occupate / g.totale) * 100 : 0
                const data = new Date(g.data + 'T12:00:00')
                return (
                  <div key={g.data} className="flex-1 group relative" style={{ minWidth: 0 }}>
                    <div
                      className={`w-full rounded-t transition-colors ${
                        perc >= 80 ? 'bg-red-400' : perc >= 50 ? 'bg-amber-400' : perc > 0 ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                      style={{ height: `${Math.max(perc, 4)}%` }}
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow">
                      {format(data, 'd MMM', { locale: it })}: {g.occupate}/{g.totale} ({Math.round(perc)}%)
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400" /> &lt;50%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> 50-80%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" /> &gt;80%</span>
            </div>
          </div>

          {/* Tabella per struttura */}
          {dati.perStruttura.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">Dettaglio per struttura</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Struttura</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Prenotazioni</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Notti</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">% revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dati.perStruttura.map((str, idx) => (
                      <tr key={`${str.nome}-${idx}`} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-900">{str.nome}</td>
                        <td className="py-2.5 text-right text-gray-600">{str.prenotazioni}</td>
                        <td className="py-2.5 text-right text-gray-600">{str.nottiOccupate}</td>
                        <td className="py-2.5 text-right font-semibold text-brand-600">
                          €{str.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2.5 text-right text-gray-400">
                          {dati.revenueTotale > 0 ? Math.round((str.revenue / dati.revenueTotale) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analisi per fonte prenotazione */}
          {dati.perFonte.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">Fonti prenotazione</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {dati.perFonte.map(f => {
                  const pctRev = dati.revenueTotale > 0 ? Math.round((f.revenue / dati.revenueTotale) * 100) : 0
                  const pctPren = (dati.numPrenotazioni > 0 ? Math.round((f.prenotazioni / dati.numPrenotazioni) * 100) : 0)
                  return (
                    <div key={f.fonte} className="rounded-xl border border-gray-200 p-3">
                      <p className="text-sm font-semibold text-gray-900">{f.fonte}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {f.prenotazioni} pren. ({pctPren}%)
                      </p>
                      <p className="text-sm font-bold text-brand-600 mt-1">
                        €{f.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pctRev}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{pctRev}% revenue</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Confronto anno su anno */}
          {dati.confrontoYoY.prevRevenue > 0 && (
            <div className="card border-l-4 border-l-purple-400">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <h2 className="text-base font-semibold text-gray-900">
                  Confronto con {MESI[mese - 1]} {anno - 1}
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Revenue</p>
                  <DeltaBadge value={dati.confrontoYoY.revenue} />
                  <p className="text-xs text-gray-400 mt-0.5">
                    €{Math.round(dati.confrontoYoY.prevRevenue).toLocaleString('it-IT')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Occupazione</p>
                  <DeltaBadge value={dati.confrontoYoY.occupazione} suffix=" pp" />
                  <p className="text-xs text-gray-400 mt-0.5">
                    {dati.confrontoYoY.prevOccupazione}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Prenotazioni</p>
                  <DeltaBadge value={dati.confrontoYoY.prenotazioni} />
                  <p className="text-xs text-gray-400 mt-0.5">
                    {dati.confrontoYoY.prevPrenotazioni}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">ADR</p>
                  <DeltaBadge value={dati.confrontoYoY.adr} />
                </div>
              </div>
            </div>
          )}

          {dati.perStruttura.length === 0 && dati.numPrenotazioni === 0 && (
            <div className="card py-12 flex flex-col items-center gap-2 text-gray-400">
              <CalendarCheck className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nessuna prenotazione confermata in questo periodo</p>
            </div>
          )}

          {/* Sezioni extra espandibili */}
          <ReportExtraSection titolo="Scadenziario Crediti" url="/api/host/report/crediti" render={(d) => (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3 text-center">
                {Object.entries(d.scadenziario || {}).map(([fascia, vals]: [string, any]) => (
                  <div key={fascia} className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-gray-500">{fascia}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{vals.count}</p>
                    <p className="text-xs text-brand-600">€{vals.totale?.toFixed(0)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Totale crediti: €{d.riepilogo?.totaleCrediti?.toFixed(2)} — {d.riepilogo?.numCrediti} posizioni</p>
            </div>
          )} />

          <ReportExtraSection titolo="Statistiche ISTAT (Nazionalità)" url={`/api/host/report/statistiche-istat?anno=${anno}&mese=${mese}`} render={(d) => (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{d.riepilogo?.totaleArrivi}</p>
                  <p className="text-xs text-gray-500">Arrivi</p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{d.riepilogo?.italiani}</p>
                  <p className="text-xs text-gray-500">Italiani</p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-lg font-bold text-purple-600">{d.riepilogo?.stranieri}</p>
                  <p className="text-xs text-gray-500">Stranieri ({d.riepilogo?.percentualeStranieri}%)</p>
                </div>
              </div>
              {d.perNazionalita?.slice(0, 8).map((n: any) => (
                <div key={n.nome} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 dark:text-slate-300">{n.nome}</span>
                  <span className="font-medium">{n.ospiti} ospiti · {n.notti} notti</span>
                </div>
              ))}
            </div>
          )} />

          <ReportExtraSection titolo="Tassa di Soggiorno" url={`/api/host/report/tassa-soggiorno?anno=${anno}&mese=${mese}`} render={(d) => (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{d.riepilogo?.prenotazioni}</p>
                  <p className="text-xs text-gray-500">Prenotazioni</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{d.riepilogo?.totaleNotti}</p>
                  <p className="text-xs text-gray-500">Notti totali</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-lg font-bold text-green-600">€{d.riepilogo?.totaleTassa?.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Tassa totale</p>
                </div>
              </div>
              {d.perStruttura?.map((s: any) => (
                <div key={s.nome} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 dark:text-slate-300">{s.nome} ({s.citta})</span>
                  <span className="font-medium">{s.notti} notti · €{s.totale?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )} />
        </>
      )}
    </div>
  )
}

function ReportExtraSection({ titolo, url, render }: {
  titolo: string; url: string; render: (data: any) => React.ReactNode
}) {
  const [aperto, setAperto] = useState(false)
  const [dati, setDati] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function carica() {
    if (dati) { setAperto(!aperto); return }
    setLoading(true); setAperto(true)
    try {
      const res = await fetch(url)
      if (res.ok) setDati(await res.json())
    } catch {}
    setLoading(false)
  }

  return (
    <div className="card">
      <button onClick={carica} className="w-full flex items-center justify-between text-left">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{titolo}</h2>
        <span className="text-xs text-brand-600">{aperto ? 'Chiudi' : 'Espandi'}</span>
      </button>
      {aperto && (
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento...
            </div>
          ) : dati ? render(dati) : <p className="text-xs text-gray-400">Nessun dato</p>}
        </div>
      )}
    </div>
  )
}

function KpiCard({
  icon, titolo, valore, bg, sub, delta,
}: {
  icon: React.ReactNode; titolo: string; valore: string; bg: string; sub?: string; delta?: React.ReactNode
}) {
  return (
    <div className="card flex items-start gap-3">
      <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 leading-tight">{valore}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 font-medium">{titolo}</p>
          {delta}
        </div>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
