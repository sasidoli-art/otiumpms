'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Lock, Unlock, Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'

type Unita = { id: string; nome: string; capacita: number; prezzoBase: number }

type DisponibilitaRecord = {
  id: string
  data: string
  postiDisponibili: number
  postiOccupati: number
  chiuso: boolean
  noteInterno: string | null
}

type CellEdit = { postiDisponibili: number; chiuso: boolean }

type Changes = Record<string, CellEdit> // key = dd-MM-yyyy

export default function DisponibilitaCalendario({
  strutturaId,
  unita,
}: {
  strutturaId: string
  unita: Unita[]
}) {
  const [unitaSelezionata, setUnitaSelezionata] = useState<Unita>(unita[0])
  const [meseCorrente, setMeseCorrente] = useState(new Date())
  const [disponibilita, setDisponibilita] = useState<DisponibilitaRecord[]>([])
  const [changes, setChanges] = useState<Changes>({})
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const chiaveMese = format(meseCorrente, 'yyyy-MM')

  const caricaDisponibilita = useCallback(async () => {
    setLoading(true)
    const res = await fetch(
      `/api/host/strutture/${strutturaId}/disponibilita?mese=${chiaveMese}&unitaId=${unitaSelezionata.id}`,
    )
    if (res.ok) {
      const data = await res.json()
      setDisponibilita(data)
    }
    setLoading(false)
  }, [strutturaId, chiaveMese, unitaSelezionata.id])

  useEffect(() => {
    caricaDisponibilita()
    setChanges({})
  }, [caricaDisponibilita])

  const dispMap = Object.fromEntries(
    disponibilita.map((d) => [format(new Date(d.data), 'yyyy-MM-dd'), d]),
  )

  const giorni = eachDayOfInterval({ start: startOfMonth(meseCorrente), end: endOfMonth(meseCorrente) })

  // Offset per la prima settimana (lun=0)
  const primoGiorno = startOfMonth(meseCorrente)
  const offset = (primoGiorno.getDay() + 6) % 7 // converti dom=0 → lun=0

  function getCell(data: Date): CellEdit {
    const chiave = format(data, 'yyyy-MM-dd')
    if (changes[chiave]) return changes[chiave]
    const d = dispMap[chiave]
    if (d) return { postiDisponibili: d.postiDisponibili, chiuso: d.chiuso }
    return { postiDisponibili: unitaSelezionata.capacita, chiuso: false }
  }

  function toggleChiuso(data: Date) {
    if (isBefore(data, startOfDay(new Date()))) return
    const chiave = format(data, 'yyyy-MM-dd')
    const curr = getCell(data)
    setChanges((prev) => ({ ...prev, [chiave]: { ...curr, chiuso: !curr.chiuso } }))
  }

  function setPosti(data: Date, v: number) {
    if (isBefore(data, startOfDay(new Date()))) return
    const chiave = format(data, 'yyyy-MM-dd')
    const curr = getCell(data)
    setChanges((prev) => ({ ...prev, [chiave]: { ...curr, postiDisponibili: v } }))
  }

  async function salvaCambiamenti() {
    if (Object.keys(changes).length === 0) return
    setSaving(true)

    const aggiornamenti = Object.entries(changes).map(([data, v]) => ({
      data,
      postiDisponibili: v.postiDisponibili,
      chiuso: v.chiuso,
    }))

    const res = await fetch(`/api/host/strutture/${strutturaId}/disponibilita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitaId: unitaSelezionata.id, aggiornamenti }),
    })

    if (res.ok) {
      setSavedMsg('Salvato!')
      setTimeout(() => setSavedMsg(''), 2000)
      setChanges({})
      caricaDisponibilita()
    }
    setSaving(false)
  }

  const hasChanges = Object.keys(changes).length > 0

  const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  return (
    <div className="space-y-4">
      {/* Selettore unità */}
      {unita.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {unita.map((u) => (
            <button
              key={u.id}
              onClick={() => { setUnitaSelezionata(u); setChanges({}) }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                unitaSelezionata.id === u.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {u.nome}
            </button>
          ))}
        </div>
      )}

      {/* Navigazione mese */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMeseCorrente((m) => subMonths(m, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold capitalize text-gray-900">
            {format(meseCorrente, 'MMMM yyyy', { locale: it })}
          </h2>
          <button onClick={() => setMeseCorrente((m) => addMonths(m, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Caricamento...</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header settimana */}
              <div className="grid grid-cols-7 mb-1">
                {GIORNI_SETTIMANA.map((g) => (
                  <div key={g} className="text-center text-xs font-semibold text-gray-400 py-1">
                    {g}
                  </div>
                ))}
              </div>

              {/* Griglia giorni */}
              <div className="grid grid-cols-7 gap-1">
                {/* Celle vuote offset */}
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {giorni.map((giorno) => {
                  const cell = getCell(giorno)
                  const passato = isBefore(giorno, startOfDay(new Date()))
                  const oggi = isToday(giorno)
                  const modificato = !!changes[format(giorno, 'yyyy-MM-dd')]

                  return (
                    <div
                      key={giorno.toISOString()}
                      className={`rounded-lg p-2 select-none ${
                        passato
                          ? 'bg-gray-50 opacity-50'
                          : cell.chiuso
                          ? 'bg-red-50 border border-red-200'
                          : modificato
                          ? 'bg-indigo-50 border border-indigo-200'
                          : 'bg-white border border-gray-200 hover:border-indigo-300'
                      } ${oggi ? 'ring-2 ring-brand-500' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${oggi ? 'text-brand-600' : 'text-gray-600'}`}>
                          {format(giorno, 'd')}
                        </span>
                        {!passato && (
                          <button
                            onClick={() => toggleChiuso(giorno)}
                            className={`p-0.5 rounded ${cell.chiuso ? 'text-red-500 hover:text-red-700' : 'text-gray-300 hover:text-gray-500'}`}
                            title={cell.chiuso ? 'Sblocca' : 'Blocca'}
                          >
                            {cell.chiuso ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      {!passato && !cell.chiuso && (
                        <input
                          type="number"
                          min={0}
                          max={unitaSelezionata.capacita * 10}
                          value={cell.postiDisponibili}
                          onChange={(e) => setPosti(giorno, Number(e.target.value))}
                          className="w-full text-xs text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-brand-400"
                          title="Posti disponibili"
                        />
                      )}

                      {cell.chiuso && !passato && (
                        <span className="text-xs text-red-500 font-medium">Chiuso</span>
                      )}

                      {passato && (
                        <span className="text-xs text-gray-400">{cell.postiDisponibili}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" /> Disponibile
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" /> Chiuso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-indigo-50 border border-indigo-200 inline-block" /> Modificato
        </span>
        <span className="text-gray-400">Il numero indica i posti disponibili</span>
      </div>

      {/* Pulsante salva */}
      <div className="flex items-center gap-3">
        <button
          onClick={salvaCambiamenti}
          disabled={!hasChanges || saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            hasChanges
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvataggio...' : `Salva modifiche${hasChanges ? ` (${Object.keys(changes).length})` : ''}`}
        </button>
        {savedMsg && <span className="text-sm text-green-600 font-medium">{savedMsg}</span>}
        {hasChanges && !saving && (
          <button
            onClick={() => setChanges({})}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Annulla
          </button>
        )}
      </div>
    </div>
  )
}
