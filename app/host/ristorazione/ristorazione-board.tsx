'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { it } from 'date-fns/locale'
import Link from 'next/link'
import {
  UtensilsCrossed, Coffee, Sun, Moon, ChevronLeft, ChevronRight,
  Loader2, Users, RefreshCw,
} from 'lucide-react'

type DettaglioPasto = {
  id: string
  ospite: string
  camera: string
  struttura: string
  numOspiti: number
  piano: string
  colazione: boolean
  pranzo: boolean
  cena: boolean
  note: string | null
}

type Coperti = { colazione: number; pranzo: number; cena: number }

const PIANI_LABEL: Record<string, string> = {
  SOLO_PERNOTTAMENTO: 'Solo pernottamento',
  PERNOTTAMENTO_COLAZIONE: 'B&B',
  MEZZA_PENSIONE: 'Mezza pensione',
  PENSIONE_COMPLETA: 'Pensione completa',
  ALL_INCLUSIVE: 'All Inclusive',
}

export default function RistorazioneBoard() {
  const [data, setData] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [coperti, setCoperti] = useState<Coperti>({ colazione: 0, pranzo: 0, cena: 0 })
  const [dettaglio, setDettaglio] = useState<DettaglioPasto[]>([])
  const [prenAttive, setPrenAttive] = useState(0)
  const [loading, setLoading] = useState(true)

  const carica = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/host/ristorazione?data=${data}`)
    if (res.ok) {
      const d = await res.json()
      setCoperti(d.coperti)
      setDettaglio(d.dettaglio)
      setPrenAttive(d.prenotazioniAttive)
    }
    setLoading(false)
  }, [data])

  useEffect(() => { carica() }, [carica])

  const giornoPrecedente = () => setData(format(subDays(new Date(data + 'T12:00'), 1), 'yyyy-MM-dd'))
  const giornoSuccessivo = () => setData(format(addDays(new Date(data + 'T12:00'), 1), 'yyyy-MM-dd'))
  const oggi = () => setData(format(new Date(), 'yyyy-MM-dd'))

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-amber-500" /> Ristorazione
          </h1>
          <p className="text-sm text-gray-500">Coperti previsti e piani pasto</p>
        </div>
        <button onClick={carica} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Aggiorna
        </button>
      </div>

      {/* Selettore data */}
      <div className="card flex items-center justify-between">
        <button onClick={giornoPrecedente} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">
            {format(new Date(data + 'T12:00'), 'EEEE d MMMM yyyy', { locale: it })}
          </p>
          <button onClick={oggi} className="text-xs text-brand-600 hover:underline mt-0.5">Oggi</button>
        </div>
        <button onClick={giornoSuccessivo} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {loading ? (
        <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          {/* KPI coperti */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card flex items-center gap-4 py-5">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Coffee className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-amber-600">{coperti.colazione}</p>
                <p className="text-xs text-gray-500">Colazioni</p>
              </div>
            </div>
            <div className="card flex items-center gap-4 py-5">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Sun className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-orange-600">{coperti.pranzo}</p>
                <p className="text-xs text-gray-500">Pranzi</p>
              </div>
            </div>
            <div className="card flex items-center gap-4 py-5">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Moon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-indigo-600">{coperti.cena}</p>
                <p className="text-xs text-gray-500">Cene</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">{prenAttive} prenotazioni attive · {dettaglio.reduce((s, d) => s + d.numOspiti, 0)} ospiti totali</p>

          {/* Dettaglio per prenotazione */}
          {dettaglio.length === 0 ? (
            <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
              <UtensilsCrossed className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nessun coperto per questa data</p>
            </div>
          ) : (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Ospite</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Camera</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Piano</th>
                      <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Pax</th>
                      <th className="text-center py-2 text-xs font-semibold text-amber-500 uppercase">Col.</th>
                      <th className="text-center py-2 text-xs font-semibold text-orange-500 uppercase">Pranzo</th>
                      <th className="text-center py-2 text-xs font-semibold text-indigo-500 uppercase">Cena</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dettaglio.map(d => (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2">
                          <Link href={`/host/prenotazioni/${d.id}`} className="font-medium text-brand-600 hover:underline">{d.ospite}</Link>
                        </td>
                        <td className="py-2 text-gray-600">{d.camera}</td>
                        <td className="py-2"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{PIANI_LABEL[d.piano] || d.piano}</span></td>
                        <td className="py-2 text-center font-medium flex items-center justify-center gap-1"><Users className="w-3 h-3 text-gray-400" />{d.numOspiti}</td>
                        <td className="py-2 text-center">{d.colazione ? <span className="text-amber-600 font-bold">{d.numOspiti}</span> : <span className="text-gray-300">—</span>}</td>
                        <td className="py-2 text-center">{d.pranzo ? <span className="text-orange-600 font-bold">{d.numOspiti}</span> : <span className="text-gray-300">—</span>}</td>
                        <td className="py-2 text-center">{d.cena ? <span className="text-indigo-600 font-bold">{d.numOspiti}</span> : <span className="text-gray-300">—</span>}</td>
                        <td className="py-2 text-xs text-gray-400 max-w-[150px] truncate">{d.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
