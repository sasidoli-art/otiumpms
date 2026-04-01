'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Waves, Clock, User, AlertTriangle, Heart, Loader2,
  CheckCircle2, ChevronRight, RefreshCw, Droplets, Hand, Thermometer,
} from 'lucide-react'
import { SignaturePad } from '@/components/spa/signature-pad'
import { cn } from '@/lib/utils'

type Appuntamento = {
  id: string
  dataOra: string
  durata: number
  stato: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  guestTelefono: string | null
  trattamento: { nome: string; durata: number; categoria: string } | null
  terapista: { nome: string; cognome: string } | null
  waiver: {
    confermato: boolean
    incinta: boolean
    incintaMesi: number | null
    allergie: string | null
    patologie: string | null
    farmaci: string | null
    condizioni: string[]
    allergieSelezionate: string[]
    zoneTrattate: string[]
    zoneEvitare: string[]
    pressioneMassaggio: string | null
    temperaturaPreferita: string | null
    notePreferenze: string | null
    firmaBase64: string | null
  } | null
  prenotazione: { id: string; checkInToken: string | null } | null
}

interface Props {
  cabinaId: string
  cabinaNome: string
  hostNome: string
}

export function CabinaKiosk({ cabinaId, cabinaNome, hostNome }: Props) {
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [selected, setSelected] = useState<Appuntamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingMode, setSigningMode] = useState(false)
  const [firma, setFirma] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [signed, setSigned] = useState(false)
  const [now, setNow] = useState(new Date())

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // Fetch appuntamenti
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/kiosk/spa/${cabinaId}`)
      if (res.ok) {
        const data = await res.json()
        setAppuntamenti(data.appuntamenti ?? [])
        // Auto-select first if none selected
        if (!selected && data.appuntamenti?.length > 0) {
          setSelected(data.appuntamenti[0])
        }
      }
    } catch {}
    setLoading(false)
  }, [cabinaId, selected])

  useEffect(() => { fetchData() }, [fetchData])

  // Refresh every 60s
  useEffect(() => {
    const t = setInterval(fetchData, 60000)
    return () => clearInterval(t)
  }, [fetchData])

  async function handleSign() {
    if (!firma || !selected) return
    setSaving(true)

    const res = await fetch(`/api/kiosk/spa/${cabinaId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appuntamentoId: selected.id,
        firmaBase64: firma,
      }),
    })

    setSaving(false)
    if (res.ok) {
      setSigned(true)
      setSigningMode(false)
      // Refresh data
      setTimeout(() => {
        setSigned(false)
        fetchData()
      }, 5000)
    }
  }

  const w = selected?.waiver

  // ═══ Schermata firmato ═══
  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Waiver firmato!</h1>
          <p className="text-lg text-gray-500 mt-2">Pronto per il trattamento</p>
        </div>
      </div>
    )
  }

  // ═══ Vista principale ═══
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header cabina */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">{cabinaNome}</p>
            <p className="text-[10px] text-slate-400">{hostNome} · SPA</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <RefreshCw size={16} className="text-slate-400" />
          </button>
          <div className="text-right">
            <p className="text-lg font-mono font-bold">
              {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[10px] text-slate-400">
              {now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Lista appuntamenti (sidebar sinistra) */}
        <div className="w-72 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appuntamenti oggi</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : appuntamenti.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Waves className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nessun appuntamento oggi</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {appuntamenti.map(a => {
                const ora = new Date(a.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                const isActive = selected?.id === a.id
                const hasWaiver = a.waiver?.confermato
                return (
                  <button
                    key={a.id}
                    onClick={() => { setSelected(a); setSigningMode(false) }}
                    className={cn(
                      'w-full text-left px-4 py-3 transition-colors',
                      isActive ? 'bg-teal-50 border-l-3 border-teal-500' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{ora}</span>
                      {hasWaiver ? (
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                      ) : (
                        <span className="w-2 h-2 bg-amber-400 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">{a.guestNome} {a.guestCognome}</p>
                    <p className="text-xs text-slate-400">{a.trattamento?.nome ?? '—'} · {a.durata}min</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Dettaglio ospite / firma */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <p>Seleziona un appuntamento</p>
            </div>
          ) : signingMode ? (
            /* ═══ Modalità firma waiver ═══ */
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Firma Waiver SPA</h2>
                <p className="text-sm text-gray-500">{selected.guestNome} {selected.guestCognome}</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-4 mb-6 text-sm text-teal-800">
                <p>Dichiaro di aver comunicato tutte le condizioni mediche rilevanti e accetto le condizioni del servizio SPA.</p>
              </div>
              <div className="mb-6">
                <p className="text-center text-sm font-semibold text-gray-700 mb-3">✍️ Firma qui sotto</p>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-2">
                  <SignaturePad onSave={(data) => setFirma(data)} />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSigningMode(false)}
                  className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-600"
                >
                  Indietro
                </button>
                <button
                  onClick={handleSign}
                  disabled={!firma || saving}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Conferma firma
                </button>
              </div>
            </div>
          ) : (
            /* ═══ Scheda ospite ═══ */
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Header ospite */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center text-xl font-bold text-teal-700">
                    {selected.guestNome[0]}{selected.guestCognome[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.guestNome} {selected.guestCognome}</h2>
                    <p className="text-sm text-gray-500">
                      {new Date(selected.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{selected.trattamento?.nome ?? '—'}
                      {' · '}{selected.durata}min
                    </p>
                  </div>
                </div>
                {selected.terapista && (
                  <div className="text-right text-sm">
                    <p className="text-slate-400">Terapista</p>
                    <p className="font-medium">{selected.terapista.nome} {selected.terapista.cognome}</p>
                  </div>
                )}
              </div>

              {/* Waiver status */}
              {!w?.confermato ? (
                <button
                  onClick={() => setSigningMode(true)}
                  className="w-full flex items-center justify-between p-4 bg-amber-50 border-2 border-amber-300 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                    <div className="text-left">
                      <p className="font-bold text-amber-900">Waiver non firmato</p>
                      <p className="text-xs text-amber-700">L'ospite deve firmare prima del trattamento</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-400" />
                </button>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="text-sm font-medium text-green-800">Waiver firmato ✓</p>
                </div>
              )}

              {/* Scheda clinica */}
              {w && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Scheda clinica</h3>

                  {/* Alert condizioni */}
                  {(w.incinta || (w.condizioni && w.condizioni.length > 0) || w.allergie || w.farmaci) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <p className="text-sm font-bold text-red-900">Attenzione</p>
                      </div>
                      {w.incinta && (
                        <p className="text-sm text-red-800">🤰 In gravidanza{w.incintaMesi ? ` (${w.incintaMesi}° mese)` : ''}</p>
                      )}
                      {w.condizioni && w.condizioni.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {w.condizioni.map(c => (
                            <span key={c} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                              {c.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                      {w.allergie && <p className="text-sm text-red-800">⚠️ Allergie: {w.allergie}</p>}
                      {w.farmaci && <p className="text-sm text-red-800">💊 Farmaci: {w.farmaci}</p>}
                    </div>
                  )}

                  {/* Preferenze */}
                  <div className="grid grid-cols-3 gap-3">
                    {w.pressioneMassaggio && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <Hand className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs text-slate-400">Pressione</p>
                        <p className="text-sm font-bold text-slate-900 capitalize">{w.pressioneMassaggio}</p>
                      </div>
                    )}
                    {w.temperaturaPreferita && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <Thermometer className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs text-slate-400">Temperatura</p>
                        <p className="text-sm font-bold text-slate-900 capitalize">{w.temperaturaPreferita}</p>
                      </div>
                    )}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                      <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">Durata</p>
                      <p className="text-sm font-bold text-slate-900">{selected.durata} min</p>
                    </div>
                  </div>

                  {/* Zone corpo */}
                  {((w.zoneTrattate && w.zoneTrattate.length > 0) || (w.zoneEvitare && w.zoneEvitare.length > 0)) && (
                    <div className="grid grid-cols-2 gap-3">
                      {w.zoneTrattate && w.zoneTrattate.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-green-700 mb-1.5">✅ Zone da trattare</p>
                          <div className="flex flex-wrap gap-1">
                            {w.zoneTrattate.map(z => (
                              <span key={z} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">{z}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {w.zoneEvitare && w.zoneEvitare.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-red-700 mb-1.5">🚫 Zone da evitare</p>
                          <div className="flex flex-wrap gap-1">
                            {w.zoneEvitare.map(z => (
                              <span key={z} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{z}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Note */}
                  {w.notePreferenze && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1">📝 Note</p>
                      <p className="text-sm text-blue-800">{w.notePreferenze}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Nessun waiver compilato */}
              {!w && (
                <div className="text-center py-8 text-slate-400">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nessuna scheda clinica compilata</p>
                  <p className="text-xs mt-1">L'ospite compilerà il waiver alla firma</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
