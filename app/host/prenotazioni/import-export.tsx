'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Download, Upload, X, Loader2, CheckCircle2, AlertTriangle, FileSpreadsheet, Info,
} from 'lucide-react'

type ImportResult = {
  totale: number
  importate: number
  errori: { riga: number; motivo: string }[]
}

// ─── CSV parser (handles quoted fields with commas/newlines) ──────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; continue }
        inQuotes = false; continue
      }
      field += c
    } else {
      if (c === '"') { inQuotes = true; continue }
      if (c === ',' || c === ';') { row.push(field.trim()); field = ''; continue }
      if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++
        row.push(field.trim()); field = ''
        if (row.some(f => f !== '')) rows.push(row)
        row = []; continue
      }
      field += c
    }
  }
  row.push(field.trim())
  if (row.some(f => f !== '')) rows.push(row)
  return rows
}

// ─── Column name mapping ─────────────────────────────────────────────────────

const COL_MAP: Record<string, string> = {
  nome: 'nome', name: 'nome', 'first name': 'nome', 'guest name': 'nome',
  cognome: 'cognome', surname: 'cognome', 'last name': 'cognome', 'family name': 'cognome',
  email: 'email', 'e-mail': 'email', 'guest email': 'email',
  telefono: 'telefono', phone: 'telefono', tel: 'telefono',
  struttura: 'struttura', property: 'struttura', hotel: 'struttura',
  unita: 'unita', room: 'unita', camera: 'unita', 'unit': 'unita',
  'data arrivo': 'dataArrivo', arrivo: 'dataArrivo', checkin: 'dataArrivo', 'check-in': 'dataArrivo', 'arrival': 'dataArrivo', 'arrival date': 'dataArrivo',
  'data partenza': 'dataPartenza', partenza: 'dataPartenza', checkout: 'dataPartenza', 'check-out': 'dataPartenza', 'departure': 'dataPartenza', 'departure date': 'dataPartenza',
  'num ospiti': 'numOspiti', ospiti: 'numOspiti', guests: 'numOspiti', pax: 'numOspiti',
  'prezzo totale': 'prezzoTotale', prezzo: 'prezzoTotale', totale: 'prezzoTotale', price: 'prezzoTotale', total: 'prezzoTotale', amount: 'prezzoTotale',
  fonte: 'fonte', source: 'fonte', channel: 'fonte',
  stato: 'stato', status: 'stato',
  lingua: 'lingua', language: 'lingua',
  'note ospite': 'noteOspite', 'guest notes': 'noteOspite',
  'note interne': 'noteInterne', 'internal notes': 'noteInterne', notes: 'noteInterne',
}

function mapHeaders(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {}
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim().replace(/[_\-]/g, ' ')
    if (COL_MAP[h]) mapping[i] = COL_MAP[h]
  }
  return mapping
}

// ─── Export button ────────────────────────────────────────────────────────────

export function ExportButton({ stato, da, a }: { stato?: string; da?: string; a?: string }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    const params = new URLSearchParams()
    if (stato) params.set('stato', stato)
    if (da) params.set('da', da)
    if (a) params.set('a', a)

    const res = await fetch(`/api/host/prenotazioni/export?${params}`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'prenotazioni.csv'
      link.click()
      URL.revokeObjectURL(url)
    }
    setLoading(false)
  }

  return (
    <button onClick={handleExport} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Esporta CSV
    </button>
  )
}

// ─── Import button + modal ────────────────────────────────────────────────────

export function ImportButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary flex items-center gap-2 text-sm">
        <Upload className="w-4 h-4" /> Importa CSV
      </button>
      {open && <ImportModal onClose={() => setOpen(false)} />}
    </>
  )
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [filename, setFilename] = useState('')
  const [righe, setRighe] = useState<Record<string, string>[]>([])
  const [colMap, setColMap] = useState<Record<number, string>>({})
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errore, setErrore] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFilename(file.name)
    setErrore('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) {
        setErrore('Il file deve contenere almeno un header e una riga di dati')
        return
      }

      const headers = parsed[0]
      setRawHeaders(headers)
      const mapping = mapHeaders(headers)
      setColMap(mapping)

      // Check required columns
      const mappedFields = Object.values(mapping)
      const missing = ['nome', 'cognome', 'email', 'dataArrivo'].filter(f => !mappedFields.includes(f))
      if (missing.length > 0) {
        setErrore(`Colonne obbligatorie non trovate: ${missing.join(', ')}. Verifica gli header del CSV.`)
        return
      }

      // Map data rows
      const dataRows = parsed.slice(1).map(row => {
        const obj: Record<string, string> = {}
        for (const [colIdx, fieldName] of Object.entries(mapping)) {
          obj[fieldName] = row[parseInt(colIdx)] ?? ''
        }
        return obj
      }).filter(r => r.nome || r.cognome || r.email) // skip empty rows

      if (dataRows.length === 0) {
        setErrore('Nessuna riga di dati valida trovata')
        return
      }

      setRighe(dataRows)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    setLoading(true)
    setErrore('')
    try {
      const res = await fetch('/api/host/prenotazioni/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ righe }),
      })
      if (!res.ok) {
        const j = await res.json()
        setErrore(j.error || 'Errore durante l\'importazione')
        setLoading(false)
        return
      }
      const data: ImportResult = await res.json()
      setResult(data)
      setStep('result')
      router.refresh()
    } catch {
      setErrore('Errore di connessione')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-500" />
            Importa prenotazioni da CSV
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errore && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {errore}
            </div>
          )}

          {step === 'upload' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Formato CSV supportato</p>
                    <p>Il file deve avere una riga di intestazione. Colonne obbligatorie:</p>
                    <p className="font-mono text-xs mt-1 bg-blue-100 rounded px-2 py-1">
                      Nome, Cognome, Email, Data Arrivo
                    </p>
                    <p className="mt-2">Colonne opzionali:</p>
                    <p className="font-mono text-xs mt-1 bg-blue-100 rounded px-2 py-1">
                      Telefono, Struttura, Unita, Data Partenza, Num Ospiti, Prezzo Totale, Fonte, Stato, Lingua, Note Ospite, Note Interne
                    </p>
                    <p className="mt-2 text-blue-600">
                      Separatore: virgola o punto e virgola. Date in formato YYYY-MM-DD. Le strutture e unita vengono abbinate per nome.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  Clicca o trascina un file CSV
                </p>
                <p className="text-xs text-gray-400 mt-1">Max 500 righe per importazione</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Anteprima: {filename}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{righe.length} righe da importare</p>
                </div>
                <button onClick={() => { setStep('upload'); setRighe([]); setErrore('') }} className="text-xs text-gray-400 hover:text-gray-600">
                  Cambia file
                </button>
              </div>

              {/* Column mapping */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Colonne riconosciute</p>
                <div className="flex flex-wrap gap-2">
                  {rawHeaders.map((h, i) => {
                    const mapped = colMap[i]
                    return (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${
                          mapped ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400 line-through'
                        }`}
                      >
                        {h} {mapped ? `→ ${mapped}` : '(ignorata)'}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Nome</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Cognome</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Arrivo</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Struttura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {righe.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-1.5">{r.nome}</td>
                        <td className="px-3 py-1.5">{r.cognome}</td>
                        <td className="px-3 py-1.5 text-gray-500">{r.email}</td>
                        <td className="px-3 py-1.5">{r.dataArrivo}</td>
                        <td className="px-3 py-1.5 text-gray-500">{r.struttura || '—'}</td>
                      </tr>
                    ))}
                    {righe.length > 10 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-2 text-center text-gray-400">
                          ... e altre {righe.length - 10} righe
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {step === 'result' && result && (
            <>
              {/* Result KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{result.totale}</p>
                  <p className="text-xs text-gray-500">Righe totali</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.importate}</p>
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Importate
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{result.errori.length}</p>
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Errori
                  </p>
                </div>
              </div>

              {result.errori.length > 0 && (
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                    <p className="text-sm font-semibold text-amber-800">Righe con errori</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {result.errori.map((e, i) => (
                      <div key={i} className="px-4 py-2 text-xs border-b border-amber-50 flex gap-3">
                        <span className="text-amber-600 font-mono shrink-0">Riga {e.riga}</span>
                        <span className="text-gray-600">{e.motivo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-5 shrink-0 flex justify-end gap-3">
          {step === 'preview' && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? 'Importazione...' : `Importa ${righe.length} prenotazioni`}
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">
            {step === 'result' ? 'Chiudi' : 'Annulla'}
          </button>
        </div>
      </div>
    </div>
  )
}
